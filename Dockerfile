# Use Node.js 22 as base for building frontend
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

# Use .NET 8 SDK for building backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-builder

WORKDIR /app/backend
COPY backend/dotnet_migration_pending/ ./
RUN dotnet restore
RUN dotnet publish -c Release -o ./publish

# Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend/publish ./

# Copy frontend dist
COPY --from=frontend-builder /app/frontend/dist/word-tracker-frontend/browser ./frontend/dist/word-tracker-frontend/browser

# Expose port (Railway will provide PORT env var at runtime)
# We expose a common port, but Railway will override via PORT env var
EXPOSE 8080

# Set environment variables
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Start the application
ENTRYPOINT ["dotnet", "WordTracker.Api.dll"]

