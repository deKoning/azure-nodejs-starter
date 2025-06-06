// ===== ADD THIS AT THE VERY TOP OF server.js (LINE 1) =====
const appInsights = require('applicationinsights');

// REPLACE 'YOUR_CONNECTION_STRING_HERE' with your actual connection string from Azure
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb';

appInsights.setup(connectionString)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .start();

const client = appInsights.defaultClient;

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

// ===== ADD THIS MIDDLEWARE AFTER app = express() BUT BEFORE YOUR ROUTES =====

// REPLACE your existing middleware with this updated version
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  
  let userInfo = null;
  
  // Extract user info from App Service Authentication headers
  try {
    // Check for the main authentication header
    if (req.headers['x-ms-client-principal']) {
      const principalData = Buffer.from(req.headers['x-ms-client-principal'], 'base64').toString();
      const principal = JSON.parse(principalData);
      
      console.log('Raw principal data:', principal); // Debug log
      
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
    // Fallback: Check other authentication headers
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
  
  // Track the page visit with enhanced user information
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
  res.locals.user = userInfo; // This makes user available in EJS templates
  
  next();
});


// Enhanced route tracking for specific pages
app.get('/', (req, res, next) => {
  // Track homepage visits separately
  client.trackEvent({
    name: 'HomePageVisit',
    properties: {
      userId: req.user?.oid || 'anonymous',
      userEmail: req.user?.email || 'anonymous',
      userName: req.user?.name || 'anonymous'
    }
  });
  next();
});

// Track user login events (add this where your login logic is)
app.post('/auth/login', (req, res, next) => {
  // This should be in your actual login route
  if (req.user) {
    client.trackEvent({
      name: 'UserLogin',
      properties: {
        userId: req.user.oid,
        userEmail: req.user.email,
        userName: req.user.name,
        loginMethod: 'AzureAD',
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
});

// Track user logout events (add this where your logout logic is)
app.post('/auth/logout', (req, res, next) => {
  if (req.user) {
    client.trackEvent({
      name: 'UserLogout',
      properties: {
        userId: req.user.oid,
        userEmail: req.user.email,
        userName: req.user.name,
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
});



// Routes
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});
