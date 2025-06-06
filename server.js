// ===== APPLICATION INSIGHTS SETUP (MUST BE FIRST) =====
const appInsights = require('applicationinsights');

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb';

appInsights.setup(connectionString)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .start();

const client = appInsights.defaultClient;

// ===== EXPRESS SETUP =====
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

// ===== SINGLE UNIFIED MIDDLEWARE FOR USER TRACKING =====
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  
  let userInfo = null;
  
  // Extract user info from App Service Authentication headers
  try {
    if (req.headers['x-ms-client-principal']) {
      const principalData = Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString();
      const principal = JSON.parse(principalData);
      
      console.log('Raw principal data:', principal);
      
      userInfo = {
        userId: principal.userId || principal.oid || principal.sub,
        userEmail: principal.userDetails || principal.claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress')?.val,
        userName: principal.userDetails?.split('@')[0] || principal.claims?.find(c => c.typ === 'name')?.val || principal.claims?.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')?.val,
        displayName: principal.claims?.find(c => c.typ === 'http://schemas.microsoft.com/identity/claims/displayname')?.val,
        principalName: principal.userDetails,
        authProvider: principal.identityProvider || 'aad'
      };
      
      console.log('✅ Extracted user info:', userInfo);
    }
    else if (req.headers['x-ms-client-principal-name']) {
      userInfo = {
        userId: req.headers['x-ms-client-principal-id'] || 'unknown',
        userEmail: req.headers['x-ms-client-principal-name'],
        userName: req.headers['x-ms-client-principal-name']?.split('@')[0] || 'unknown',
        principalName: req.headers['x-ms-client-principal-name'],
        authProvider: 'aad'
      };
      
      console.log('✅ Extracted user info from headers:', userInfo);
    }
    else {
      console.log('❌ No authentication headers found');
    }
  } catch (error) {
    console.error('❌ Error extracting user info:', error);
  }
  
  // Track the page visit with user information
  client.trackEvent({
    name: 'PageVisit',
    properties: {
      // Page information
      path: req.path,
      method: req.method,
      fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
      
      // User information
      userId: userInfo?.userId || 'anonymous',
      userEmail: userInfo?.userEmail || 'anonymous',
      userName: userInfo?.userName || 'anonymous',
      displayName: userInfo?.displayName || 'anonymous',
      principalName: userInfo?.principalName || 'anonymous',
      authProvider: userInfo?.authProvider || 'none',
      isAuthenticated: !!userInfo,
      
      // Technical information
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      referer: req.get('Referer') || 'direct',
      timestamp: new Date().toISOString()
    }
  });
  
  // Set user context for Application Insights correlation
  if (userInfo) {
    client.setAuthenticatedUserContext(userInfo.userId, userInfo.userEmail);
  }
  
  // Make user info available to routes and views
  req.currentUser = userInfo;
  res.locals.user = userInfo;
  
  next();
});

// ===== ROUTES =====
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Welcome to Azure!',
        message: 'Your Node.js app is running successfully on Azure App Service'
    });
});

app.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About',
        description: 'This is a sample Node.js application deployed on Azure App Service'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    });
});

// ===== ERROR HANDLING =====
// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Page Not Found',
        url: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});
