# LeadForge crawler worker — runs Playwright jobs from the Supabase queue.
# Build from the REPO ROOT:  docker build -f worker/Dockerfile -t leadforge-worker .
# Run:  docker run -d --restart=always \
#   -e NEXT_PUBLIC_SUPABASE_URL=... \
#   -e SUPABASE_SERVICE_ROLE_KEY=... \
#   -e PAGESPEED_API_KEY=... \
#   leadforge-worker

FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

# Install only what the worker needs.
COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm install esbuild --no-audit --no-fund

# Worker source + the shared lib it bundles.
COPY tsconfig.json ./
COPY lib ./lib
COPY worker ./worker

RUN npx esbuild worker/index.ts --bundle --platform=node --packages=external \
    --alias:@=. --outfile=worker/.build/worker.cjs

CMD ["node", "worker/.build/worker.cjs"]
