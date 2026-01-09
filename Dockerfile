FROM apify/actor-node-puppeteer-chrome:18

# Set environment variables
ENV NODE_ENV=production
ENV APIFY_LOCAL_STORAGE_DIR=/apify_storage

# Create non-root user
RUN useradd -m -u 1000 -U actor && \
    mkdir -p /home/actor/apify_storage && \
    chown -R actor:actor /home/actor /apify_storage

# Switch to non-root user
USER actor

# Copy package files
COPY --chown=actor:actor package*.json ./

# Install dependencies
RUN npm ci --only=production --no-optional && \
    npm audit --production --audit-level=high || true

# Copy source code
COPY --chown=actor:actor . ./

# Create directories
RUN mkdir -p logs data

# Set permissions
RUN chmod 600 .env.example && \
    chmod 700 scripts/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4321/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Run the application
CMD npm start