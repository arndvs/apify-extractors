# actors/master-orchestrator/Dockerfile
# Use the official Apify Node.js image as base
FROM apify/actor-node:18

# First install TypeScript globally
RUN npm install -g typescript

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files and configs
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Run the actor
CMD ["npm", "start"]
