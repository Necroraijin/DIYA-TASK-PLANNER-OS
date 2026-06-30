FROM node:20-alpine

WORKDIR /app

# Copy package config and lock files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source files
COPY . .

# Compile/build production app and compile server.ts to server.js
RUN npm run build && npx tsc server.ts --noEmit false --module commonjs --esModuleInterop --moduleResolution node --skipLibCheck

# Expose standard web traffic port (Cloud Run forwards here)
EXPOSE 3000

ENV NODE_ENV=production

# Start using the compiled JavaScript server file
CMD ["node", "server.js"]
