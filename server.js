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

app.use((req, res, next) => {
  // Track every page visit
  client.trackEvent({
    name: 'PageVisit',
    properties: {
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    }
  });
  
  next();
});

// ===== THEN CONTINUE WITH YOUR EXISTING ROUTES =====
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
