FROM apify/actor-node-puppeteer-chrome:18

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies for build
RUN npm --quiet set progress=false \
    && npm install \
    && echo "Installed NPM packages:" \
    && (npm list || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy source code
COPY . ./

# Run NPM build
RUN npm run build

# Clean up devDependencies after build
RUN npm prune --production

# Run the actor
CMD npm run start
