# Base image: Node.js runtime on Debian (has apt so we can install Chromium)
FROM node:22-bullseye-slim

# Install Chromium
RUN apt-get update \
    && apt-get install -y chromium \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Azure expects apps to listen on $PORT
ENV PORT=80
EXPOSE 80

# Tell Puppeteer where Chromium lives
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start your app
CMD ["node", "server.js"]
