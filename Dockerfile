# Use Node 20
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create folders inside container
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
