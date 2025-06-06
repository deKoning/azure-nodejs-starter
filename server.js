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

// Application Insights middleware (FIXED VERSION)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  
  // Only track if Application Insights is working
  if (client) {
    try {
      let userInfo = null;
      
      // Extract user info from App Service Authentication
      if (req.headers['x-ms-client-principal']) {
        try {
          const principalData = Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString();
          const principal = JSON.parse(principalData);
          
          userInfo = {
            userId: principal.userId || principal.oid || 'unknown',
            userEmail: principal.userDetails || 'unknown',
            userName: (principal.userDetails || 'unknown').split('@')[0]
          };
          
          console.log('✅ User found:', userInfo.userName);
        } catch (userError) {
          console.log('Error parsing user info:', userError.message);
        }
      }
      
      // Track page visit (REMOVED the problematic setAuthenticatedUserContext call)
      client.trackEvent({
        name: 'PageVisit',
        properties: {
          path: req.path,
          method: req.method,
          userId: userInfo?.userId || 'anonymous',
          userEmail: userInfo?.userEmail || 'anonymous',
          userName: userInfo?.userName || 'anonymous',
          isAuthenticated: !!userInfo,
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      
      // ALTERNATIVE: Set user context using telemetry initializer (safer method)
      if (userInfo) {
        client.addTelemetryProcessor((envelope) => {
          envelope.tags = envelope.tags || {};
          envelope.tags['ai.user.id'] = userInfo.userId;
          envelope.tags['ai.user.authUserId'] = userInfo.userEmail;
          return true;
        });
      }
      
      // Make user available to routes
      req.currentUser = userInfo;
      res.locals.user = userInfo;
      
    } catch (trackingError) {
      console.error('Tracking error:', trackingError.message);
      // Continue even if tracking fails
    }
  }
  
  next();
});

// Routes
app.get('/', (req, res) => {
    try {
        res.render('index', { 
            title: 'Welcome to Azure!',
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
