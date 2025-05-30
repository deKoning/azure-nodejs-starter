# Azure Node.js Starter App

A beautiful, modern Node.js web application designed for deployment on Azure App Service. This starter template includes a responsive design, multiple pages, and API endpoints.

## Features

- **Modern Node.js & Express**: Built with the latest Node.js and Express.js
- **Responsive Design**: Beautiful UI that works on all devices
- **Multiple Pages**: Home, About, and 404 error pages
- **API Endpoints**: RESTful API with status endpoint
- **Azure Optimized**: Configured for seamless Azure App Service deployment
- **EJS Templates**: Server-side rendering with EJS
- **Animations & Effects**: Modern CSS animations and interactive elements

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd azure-nodejs-starter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Deploy to Azure

#### Option 1: GitHub Actions (Recommended)

1. Fork this repository to your GitHub account
2. In Azure Portal, go to your App Service
3. Navigate to **Deployment Center**
4. Choose **GitHub** as source
5. Authorize and select this repository
6. Azure will automatically set up GitHub Actions for deployment

#### Option 2: Azure CLI

```bash
# Login to Azure
az login

# Deploy directly
az webapp up --name <your-app-name> --resource-group <your-resource-group>
```

#### Option 3: VS Code Extension

1. Install the Azure App Service extension for VS Code
2. Sign in to your Azure account
3. Right-click your project folder
4. Select "Deploy to Web App"

## Project Structure

```
azure-nodejs-starter/
├── public/                 # Static files
│   ├── css/
│   │   └── style.css      # Main stylesheet
│   └── js/
│       └── main.js        # Client-side JavaScript
├── views/                 # EJS templates
│   ├── index.ejs         # Home page
│   ├── about.ejs         # About page
│   └── 404.ejs           # Error page
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Available Routes

- **GET /**: Home page with feature showcase
- **GET /about**: About page with project information
- **GET /api/status**: JSON API endpoint for application status
- **404 Handler**: Custom 404 error page for unmatched routes

## API Endpoints

### GET /api/status

Returns application status information:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "port": 80
}
```

## Environment Variables

The app automatically uses these environment variables when available:

- `PORT`: Server port (defaults to 3000)
- `NODE_ENV`: Environment mode (development/production)

## Customization

### Modify Content

1. **Update pages**: Edit files in the `views/` directory
2. **Change styling**: Modify `public/css/style.css`
3. **Add functionality**: Update `server.js` and `public/js/main.js`

### Add New Routes

```javascript
app.get('/new-page', (req, res) => {
    res.render('new-page', { 
        title: 'New Page',
        data: 'Your data here'
    });
});
```

### Add Database

To add database functionality:

1. Install database package (e.g., `npm install mongoose` for MongoDB)
2. Add connection configuration to `server.js`
3. Create models and routes as needed

## Scripts

- `npm start`: Start the production server
- `npm run dev`: Start development server with auto-reload

## Technologies Used

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **EJS**: Templating engine
- **CSS3**: Modern styling with animations
- **Font Awesome**: Icons
- **Azure App Service**: Cloud hosting platform

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the Azure App Service documentation
2. Review the troubleshooting section below
3. Open an issue in this repository

## Troubleshooting

### Common Issues

**App not starting on Azure:**
- Ensure `package.json` has the correct start script
- Check that the PORT environment variable is being used
- Verify all dependencies are listed in `package.json`

**Static files not loading:**
- Confirm files are in the `public/` directory
- Check that Express static middleware is configured
- Verify file paths in HTML templates

**Template errors:**
- Ensure EJS files are in the `views/` directory
- Check that the view engine is set to 'ejs'
- Verify template syntax is correct

## Next Steps

After deployment, consider adding:

- User authentication
- Database integration
- API rate limiting
- Monitoring and logging
- Custom domain and SSL
- CDN for static assets
