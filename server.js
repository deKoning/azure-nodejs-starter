// server.js
// A11y scanner (axe-core + Puppeteer) with Azure App Insights telemetry (optional) and Easy Auth user parsing.

require('dotenv').config(); // local .env; on Azure use App Settings

// ----------------------
// Application Insights (optional)
// ----------------------
let appInsightsClient = null;
try {
  const appInsights = require('applicationinsights');
  const cs = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (cs) {
    appInsights
      .setup(cs)
      .setAutoCollectRequests(true)
      .setAutoCollectExceptions(true)
      .start();
    appInsightsClient = appInsights.defaultClient;
    console.log('✅ Application Insights initialized');
  } else {
    console.log('ℹ️  Application Insights not configured (set APPLICATIONINSIGHTS_CONNECTION_STRING)');
  }
} catch (err) {
  console.warn('⚠️  Application Insights disabled:', err?.message || err);
}

// ----------------------
// Core modules & setup
// ----------------------
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const pino = require('pino');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty' }
});

// ----------------------
// Express configuration
// ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet());
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

console.log('Views directory:', app.get('views'));

// ----------------------
// Telemetry + user parsing middleware (Azure Easy Auth aware)
// ----------------------
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'HTTP request');

  if (appInsightsClient) {
    try {
      let userInfo = null;

      // Method 1: Parse the base64 JSON from Easy Auth (x-ms-client-principal)
      if (req.headers['x-ms-client-principal']) {
        try {
          const principalRaw = Buffer.from(
            req.headers['x-ms-client-principal'],
            'base64'
          ).toString();
          const principal = JSON.parse(principalRaw);

          const extractClaim = (principal, keys = []) => {
            for (const key of keys) {
              const found =
                principal.claims?.find(c => c.typ === key)?.val ??
                principal[key];
              if (found) return found;
            }
            return undefined;
          };

          const extractEmail =
            extractClaim(principal, [
              'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
              'email',
              'preferred_username',
              'userDetails'
            ]) || 'unknown@domain.com';

          const extractName =
            extractClaim(principal, [
              'name',
              'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
              'http://schemas.microsoft.com/identity/claims/displayname'
            ]) ||
            (principal.userDetails
              ? principal.userDetails.split('@')[0]
              : 'Unknown User');

          const extractUserId =
            principal.userId ||
            extractClaim(principal, [
              'http://schemas.microsoft.com/identity/claims/objectidentifier',
              'oid',
              'sub'
            ]) ||
            'unknown-id';

          userInfo = {
            userId: extractUserId,
            userEmail: extractEmail,
            userName: extractName,
            displayName: extractName,
            principalName: principal.userDetails || 'unknown',
            authProvider: principal.identityProvider || 'aad',
            claimsCount: principal.claims?.length || 0,
            method: 'principal-header'
          };
        } catch (e) {
          logger.warn({ err: e }, 'Error parsing x-ms-client-principal');
        }
      }
      // Method 2: Fallback to individual headers
      else if (req.headers['x-ms-client-principal-name']) {
        const email = req.headers['x-ms-client-principal-name'];
        userInfo = {
          userId: req.headers['x-ms-client-principal-id'] || 'header-unknown-id',
          userEmail: email,
          userName: email?.split('@')[0] || 'header-unknown',
          principalName: email,
          authProvider: req.headers['x-ms-client-principal-idp'] || 'aad',
          method: 'individual-headers'
        };
      }

      // Attach to req/res for routes to use if needed
      req.currentUser = userInfo;
      res.locals.user = userInfo;

      // Track a lightweight event for each request
      appInsightsClient.trackEvent({
        name: 'PageVisit',
        properties: {
          path: req.path,
          method: req.method,
          fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          userId: userInfo?.userId || 'anonymous',
          userEmail: userInfo?.userEmail || 'anonymous',
          userName: userInfo?.userName || 'anonymous',
          displayName: userInfo?.displayName || 'anonymous',
          principalName: userInfo?.principalName || 'anonymous',
          authProvider: userInfo?.authProvider || 'none',
          isAuthenticated: !!userInfo,
          userExtractionMethod: userInfo?.method || 'none',
          claimsCount: userInfo?.claimsCount || 0,
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip || req.connection?.remoteAddress || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      logger.error({ err: e }, 'Telemetry middleware error');
    }
  }

  next();
});

// ----------------------
// Rate limit only the scanning endpoint
// ----------------------
const testLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // up to 6 scans/min/IP
  standardHeaders: true,
  legacyHeaders: false
});

// ----------------------
// Routes
// ----------------------
app.get('/', (req, res) => {
  try {
    res.render('index', {
      title: 'Accessibility Test',
      message: 'Enter a URL to test.'
    });
  } catch (e) {
    logger.error({ err: e }, 'Error rendering index');
    res.status(500).send('Error rendering page');
  }
});

// Redirect GET /test to /
app.get('/test', (req, res) => res.redirect(302, '/'));

app.get('/about', (req, res) => {
  try {
    res.render('about', {
      title: 'About',
      description:
        'This is a sample Node.js application that runs accessibility scans with axe-core + Puppeteer.'
    });
  } catch (e) {
    logger.error({ err: e }, 'Error rendering about');
    res.status(500).send('Error rendering page');
  }
});

app.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      appInsights: !!appInsightsClient
    });
  } catch (e) {
    logger.error({ err: e }, 'Error in status API');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple health endpoint
app.get('/healthz', (req, res) => res.type('text').send('ok'));

// ----------------------
// A11y test (POST)
// ----------------------
app.post('/test', testLimiter, async (req, res) => {
  const input = (req.body?.url || '').trim();

  // Validate and normalize URL
  let url;
  try {
    if (!validator.isURL(input, { require_protocol: true, protocols: ['http', 'https'] })) {
      throw new Error('Please enter a valid URL starting with http:// or https://');
    }
    const u = new URL(input);
    u.hash = '';
    url = u.toString();
  } catch (e) {
    return res.status(400).render('index', {
      title: 'Accessibility Test',
      message: e.message,
      error: e.message
    });
  }

  // Puppeteer launch options (work locally & on Azure)
  const isLinux = process.platform === 'linux';
  const launchOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      ...(isLinux ? ['--single-process'] : [])
    ]
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const navTimeoutMs = 30_000;
  let browser;

  try {
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setBypassCSP(true);
    await page.setViewport({ width: 1366, height: 900 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: navTimeoutMs });

    const results = await new AxePuppeteer(page)
      .configure({
        rules: {
          'target-size': { enabled: true }
        }
      })
      .analyze();

    await browser.close();

    if (appInsightsClient) {
      appInsightsClient.trackEvent({
        name: 'A11yScanCompleted',
        properties: {
          url,
          violations: results.violations.length,
          passes: results.passes.length,
          incomplete: results.incomplete.length,
          inapplicable: results.inapplicable.length
        }
      });
    }

    res.render('results', {
      title: 'Accessibility Results',
      targetUrl: url,
      results
    });
  } catch (error) {
    logger.error({ err: error, url }, 'Accessibility test error');
    try { if (browser) await browser.close(); } catch (_) {}

    if (appInsightsClient) {
      appInsightsClient.trackException({ exception: error });
    }

    res.status(500).render('index', {
      title: 'Accessibility Test',
      message: 'Something went wrong while testing the URL.',
      error: error.message
    });
  }
});

// ----------------------
// 404 & Error handlers
// ----------------------
app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).send('Internal Server Error - Check logs for details');
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Application Insights: ${appInsightsClient ? 'Enabled' : 'Disabled'}`);
});
