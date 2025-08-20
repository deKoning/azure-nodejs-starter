// Application Insights setup (with error handling)
let client = null;
try {
  const appInsights = require('applicationinsights');
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb';

  appInsights.setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectExceptions(true)
    .start();

  client = appInsights.defaultClient;
  console.log('✅ Application Insights initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Application Insights:', error);
  console.log('Continuing without Application Insights...');
}

// Express setup
const express = require('express');
const path = require('path');
const app = express();

// Puppeteer setup (if needed for testing)
const puppeteer = require('puppeteer');
const pa11y = require('pa11y');  // if not already required

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced middleware with better user detection
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Client exists: ${!!client}`);
  
  // Only track if Application Insights is working
  if (client) {
    try {
      let userInfo = null;
      
      // Debug: Log all authentication headers
      console.log('=== AUTH HEADERS DEBUG ===');
      console.log('x-ms-client-principal exists:', !!req.headers['x-ms-client-principal']);
      console.log('x-ms-client-principal-name:', req.headers['x-ms-client-principal-name']);
      console.log('x-ms-client-principal-id:', req.headers['x-ms-client-principal-id']);
      console.log('x-ms-client-principal-idp:', req.headers['x-ms-client-principal-idp']);
      
      // Method 1: Extract from x-ms-client-principal header (base64 encoded)
      if (req.headers['x-ms-client-principal']) {
        try {
          const principalData = Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString();
          console.log('Raw principal data (first 200 chars):', principalData.substring(0, 200));
          
          const principal = JSON.parse(principalData);
          console.log('Parsed principal keys:', Object.keys(principal));
          console.log('Principal user details:', principal.userDetails);
          console.log('Principal user ID:', principal.userId);
          console.log('Principal claims:', principal.claims?.length || 'No claims');
          
          // Extract user information with multiple fallback methods
          const extractEmail = () => {
            return principal.userDetails || 
                   principal.claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')?.val ||
                   principal.claims?.find(c => c.typ === 'email')?.val ||
                   principal.claims?.find(c => c.typ === 'preferred_username')?.val ||
                   'unknown@domain.com';
          };
          
          const extractName = () => {
            return principal.claims?.find(c => c.typ === 'name')?.val ||
                   principal.claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')?.val ||
                   principal.claims?.find(c => c.typ === 'http://schemas.microsoft.com/identity/claims/displayname')?.val ||
                   principal.userDetails?.split('@')[0] ||
                   'Unknown User';
          };
          
          const extractUserId = () => {
            return principal.userId ||
                   principal.oid ||
                   principal.sub ||
                   principal.claims?.find(c => c.typ === 'http://schemas.microsoft.com/identity/claims/objectidentifier')?.val ||
                   principal.claims?.find(c => c.typ === 'oid')?.val ||
                   'unknown-id';
          };
          
          userInfo = {
            userId: extractUserId(),
            userEmail: extractEmail(),
            userName: extractName(),
            displayName: extractName(),
            principalName: principal.userDetails || 'unknown',
            authProvider: principal.identityProvider || 'aad',
            claimsCount: principal.claims?.length || 0
          };
          
          console.log('✅ Extracted user info:', JSON.stringify(userInfo, null, 2));
          
        } catch (userError) {
          console.log('❌ Error parsing x-ms-client-principal:', userError.message);
        }
      }
      
      // Method 2: Fallback to individual headers
      else if (req.headers['x-ms-client-principal-name']) {
        userInfo = {
          userId: req.headers['x-ms-client-principal-id'] || 'header-unknown-id',
          userEmail: req.headers['x-ms-client-principal-name'],
          userName: req.headers['x-ms-client-principal-name']?.split('@')[0] || 'header-unknown',
          principalName: req.headers['x-ms-client-principal-name'],
          authProvider: req.headers['x-ms-client-principal-idp'] || 'aad',
          method: 'individual-headers'
        };
        
        console.log('✅ Extracted user info from individual headers:', JSON.stringify(userInfo, null, 2));
      }
      
      // Method 3: Check for other possible headers
      else {
        console.log('❌ No authentication headers found');
        console.log('Available headers:', Object.keys(req.headers).filter(h => h.includes('principal') || h.includes('auth')));
      }
      
      console.log('Final user info:', userInfo ? 'Found user' : 'No user');
      console.log('Sending tracking event for:', req.path);
      
      // Track page visit with enhanced user information
      client.trackEvent({
        name: 'PageVisit',
        properties: {
          // Page info
          path: req.path,
          method: req.method,
          fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
          
          // User info
          userId: userInfo?.userId || 'anonymous',
          userEmail: userInfo?.userEmail || 'anonymous',
          userName: userInfo?.userName || 'anonymous',
          displayName: userInfo?.displayName || 'anonymous',
          principalName: userInfo?.principalName || 'anonymous',
          authProvider: userInfo?.authProvider || 'none',
          isAuthenticated: !!userInfo,
          userExtractionMethod: userInfo?.method || 'principal-header',
          claimsCount: userInfo?.claimsCount || 0,
          
          // Technical info
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Tracking event sent with user:', userInfo?.userName || 'anonymous');
      
      // Make user available to routes
      req.currentUser = userInfo;
      res.locals.user = userInfo;
      
    } catch (trackingError) {
      console.error('❌ Tracking error:', trackingError.message);
      console.error('Stack:', trackingError.stack);
    }
  } else {
    console.log('⚠️ Application Insights client not available');
  }
  
  next();
});

// Test route for accessibility checks
app.post('/test', async (req, res) => {
  try {
    const url = req.body.url;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = await pa11y(url, { browser });

    await browser.close();

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});


// Routes
app.get('/', (req, res) => {
    try {
        res.render('index', { 
            title: 'Welcome to the Accessibility Web App',
            message: 'Your Node.js app is running successfully on Azure App Service'
        });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.status(500).send('Error rendering page');
    }
});

app.get('/about', (req, res) => {
    try {
        res.render('about', { 
            title: 'About',
            description: 'This is a sample Node.js application deployed on Azure App Service'
        });
    } catch (error) {
        console.error('Error rendering about:', error);
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
            appInsights: !!client
        });
    } catch (error) {
        console.error('Error in status API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accessibility test route
// const pa11y = require('pa11y'); > already required above
const { access } = require('fs');

app.post('/test', async (req, res) => {
  const url = req.body.url;

  try {
    const results = await pa11y(url, {
      standard: 'WCAG2AA',
      includeNotices: true,
      includeWarnings: true,
      wait: 1000, // Wait for 1 second to allow page to load
  });

    res.render('report', {
      title: 'Toegankelijkheidsrapport',
      url,
      issues: results.issues
    });
  } catch (error) {
    console.error('Fout bij uitvoeren van pa11y:', error);
    res.status(500).send('Er ging iets mis bij het uitvoeren van de toegankelijkheidstest.');
  }
});



// 404 handler
app.use((req, res) => {
    res.status(404).send('Page Not Found');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('=== ERROR DETAILS ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);
    console.error('=====================');
    
    res.status(500).send('Internal Server Error - Check logs for details');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Application Insights: ${client ? 'Enabled' : 'Disabled'}`);
});
