# Build frontend
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Server (Node without pre-installed language runtimes)
FROM node:20
WORKDIR /app
COPY package*.json ./

# Install required system tools (unzip for setup scripts)
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

# Install standard dependencies (includes scripts requirements)
RUN npm install --production

# Copy build and server files
COPY --from=build /app/dist /app/dist
COPY server /app/server
COPY scripts /app/scripts

EXPOSE 8080
ENV PORT=8080

# Execute the setup scripts (download-jdk, download-python, download-java-libs)
# at container runtime, then start the server.
CMD ["sh", "-c", "npm run setup && npm start"]
