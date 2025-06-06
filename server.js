// Minimal working server.js - TEST THIS FIRST
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

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
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
            port: PORT
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

// Error handler with detailed logging
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
});
