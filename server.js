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
