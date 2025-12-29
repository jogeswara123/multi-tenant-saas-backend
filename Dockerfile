FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
