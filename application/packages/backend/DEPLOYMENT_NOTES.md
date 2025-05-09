# Deployment Notes: Backend, Qdrant & Nginx on Fly.io

## 1. Overview

This document outlines the setup for deploying the NestJS backend application, Qdrant vector database, and Nginx (as a reverse proxy) together in a single Docker container to Fly.io. The goal is to have the backend API accessible under `/api/` and the Qdrant dashboard UI accessible under `/qdrant/dashboard/`.

## 2. `Dockerfile` Breakdown

The `application/packages/backend/Dockerfile` uses a multi-stage build to create an optimized final image.

*   **Stage 1: `builder`**
    *   Base: `node:20-slim`
    *   Purpose: Install dependencies and build the monorepo TypeScript projects.
    *   Steps:
        *   Copies `package.json`, `package-lock.json` (if present) for the root, common, and backend packages.
        *   Runs `npm ci` to install all monorepo dependencies.
        *   Copies the entire monorepo source code.
        *   Builds `@narrow-ai-matchmaker/common`.
        *   Builds `@narrow-ai-matchmaker/backend`.

*   **Stage 2: `backend`**
    *   Base: `node:20-slim`
    *   Purpose: Assemble a minimal runtime for the backend application, including only necessary built files and production dependencies.
    *   Steps:
        *   Copies `dist` (build output) from the `builder` stage for both common and backend packages.
        *   Copies root `node_modules`.
        *   Copies `package.json` for backend and common packages.
        *   Copies the pre-generated `profile_schema.json` into the backend's `dist` directory.

*   **Stage 3: `qdrant`**
    *   Base: `qdrant/qdrant:latest`
    *   Purpose: Act as a source for Qdrant application files.

*   **Stage 4: `final` (Runtime Image)**
    *   Base: `node:20-slim` (Debian-based, compatible with Qdrant's glibc dependencies).
    *   `WORKDIR /app`.
    *   **Dependencies Installation**:
        *   Installs `nginx`, `curl` (for health checks/debugging), and `libunwind8` (a runtime dependency for Qdrant).
        *   Removes the default Nginx site configuration to prevent conflicts.
    *   **Application Setup**:
        *   Copies the prepared backend application from the `backend` stage into `/app/backend/`.
        *   Copies the entire Qdrant application directory (containing binary, `static` assets for UI, default `config`, `entrypoint.sh`, etc.) from the `qdrant` stage into `/app/qdrant/`.
    *   **Nginx and Startup Script**:
        *   Creates `/etc/nginx/conf.d`.
        *   Copies `packages/backend/nginx.conf` to `/etc/nginx/conf.d/default.conf`.
        *   Copies `packages/backend/start.sh` to `/app/start.sh`.
    *   **Logging**:
        *   Symlinks Nginx's default log files (`/var/log/nginx/access.log` and `/var/log/nginx/error.log`) to `/dev/stdout` and `/dev/stderr` respectively. This ensures Nginx logs are captured by Docker's logging driver and visible via `docker logs` or Fly.io logs.
    *   **Permissions**:
        *   Sets execute permissions for `/app/start.sh`, `/app/qdrant/qdrant` (Qdrant binary), and `/app/qdrant/entrypoint.sh`.
        *   Sets read permissions for Qdrant's static assets (`/app/qdrant/static`).
    *   **Debugging**: Includes `ls -la` commands for key directories to aid in debugging image builds (these only run during build time).
    *   **Exposure & Command**:
        *   `EXPOSE 80`: Nginx will listen on this port inside the container.
        *   `CMD ["/app/start.sh"]`: Specifies the default command to run when the container starts.

## 3. `start.sh` Script

The `/app/start.sh` script orchestrates the startup of Qdrant, the backend, and Nginx.

1.  **Debugging `ls` commands** (for runtime debugging if needed).
2.  **Start Qdrant**:
    *   ` (cd /app/qdrant && ./qdrant) &`
    *   This changes the current directory to `/app/qdrant` before executing the Qdrant binary (`./qdrant`). This is crucial because Qdrant needs to find its `static` assets directory (for the UI) relative to its working directory (e.g., `./static/index.html`).
    *   Qdrant is started in the background.
3.  **Wait for Qdrant**:
    *   A loop uses `curl -s http://localhost:6333/healthz` to poll Qdrant's health check endpoint until it's ready.
4.  **Start Backend**:
    *   `(cd /app/backend && NODE_PATH=/app/backend/node_modules node packages/backend/dist/src/main.js) &`
    *   Changes directory to `/app/backend`.
    *   Sets `NODE_PATH` to ensure monorepo `node_modules` are resolved correctly.
    *   Starts the NestJS application using `node`.
    *   The backend is started in the background.
5.  **Test Nginx Configuration**:
    *   `nginx -t`
6.  **Start Nginx**:
    *   `nginx -g 'daemon off;'`
    *   Starts Nginx in the foreground. This is standard practice for the main process in a Docker container, allowing Docker to manage its lifecycle.

## 4. Nginx Configuration (`nginx.conf`)

Located at `packages/backend/nginx.conf` and copied to `/etc/nginx/conf.d/default.conf` in the image.

*   **Upstreams**:
    *   `upstream backend { server 127.0.0.1:3000; }`: Defines the NestJS backend service, assumed to be running on port 3000 internally.
    *   `upstream qdrant { server 127.0.0.1:6333; }`: Defines the Qdrant service, running on port 6333 internally.
*   **Server Block** (listens on port 80):
    *   `access_log /var/log/nginx/access.log;`
    *   `error_log /var/log/nginx/error.log debug;` (Debug level for detailed error information).
    *   **API Proxy**:
        *   `location /api/ { proxy_pass http://backend; ... }`
        *   Requests to `/api/...` are proxied to the NestJS backend.
    *   **Qdrant Dashboard UI Proxy (Entry Point)**:
        *   `location = /qdrant/dashboard { proxy_pass http://qdrant/dashboard; ... }`
        *   Exact match for `/qdrant/dashboard`.
        *   Proxies requests to `http://qdrant_upstream/dashboard`. This is where the Qdrant binary (when run from the correct CWD) serves its main UI page (`index.html`).
    *   **Qdrant Dashboard UI Assets Proxy**:
        *   `location /qdrant/ { rewrite ^/qdrant/(.*)$ /$1 break; proxy_pass http://qdrant; ... }`
        *   Matches any request starting with `/qdrant/` (e.g., `/qdrant/static/main.js`, `/qdrant/logo.png`).
        *   `rewrite ^/qdrant/(.*)$ /$1 break;`: This is crucial. It strips the `/qdrant/` prefix from the request URI. For example, `/qdrant/static/main.js` becomes `/static/main.js`.
        *   `proxy_pass http://qdrant;`: The rewritten URI is then proxied to the `qdrant` upstream. So, Qdrant receives a request for `/static/main.js`, which it can serve from its `static` directory.
    *   **Root Location (Default)**:
        *   `location / { proxy_pass http://qdrant/; ... }`
        *   Acts as a catch-all. If a user navigates to the root of the deployed application (`http://your-fly-app.fly.dev/`), this will proxy to the root of the Qdrant service, which by default serves its API information as JSON.

## 5. Fly.io Configuration (`fly.toml`)

Key settings relevant to this setup:

*   `app = 'narrow-ai-titanic-backend'`: Your application name on Fly.io.
*   `[build] dockerfile = 'Dockerfile'`: Specifies the Dockerfile in the backend package to be used for building the image on Fly.
*   `[env]`:
    *   `PORT = '3000'`: While Nginx listens on 80, this might be used by the backend if it directly received traffic or for internal reference.
    *   `QDRANT_URL = 'http://localhost:6333'`: Used by the NestJS backend to communicate with the Qdrant instance running in the same container.
*   `[[mounts]]`:
    *   `source = 'qdrant_data'`
    *   `destination = '/app/qdrant/storage'`
    *   Configures a persistent volume for Qdrant's data, ensuring data isn't lost across deployments or restarts. The path `/app/qdrant/storage` matches Qdrant's typical data directory.
*   `[http_service]`:
    *   `internal_port = 80`: This is critical. It tells Fly.io to forward incoming HTTP/HTTPS traffic to port 80 inside your container, which is where Nginx is listening.
    *   `auto_stop_machines = 'off'`, `min_machines_running = 1`: Recommended for applications that need to be continuously available.

## 6. Key Challenge & Solution Summary

The primary challenge was correctly serving the Qdrant dashboard UI, which is a web application with its own assets, through Nginx when Qdrant itself was also running behind the same Nginx proxy.

*   **Problem 1: Qdrant not finding UI assets.**
    *   **Cause**: Qdrant binary was being run from `/app` (the `WORKDIR`), but its static assets were in `/app/qdrant/static`. It looks for `./static` relative to its Current Working Directory (CWD).
    *   **Solution**: In `start.sh`, change directory to `/app/qdrant` before executing the `./qdrant` binary: `(cd /app/qdrant && ./qdrant) &`.

*   **Problem 2: Nginx routing for Qdrant UI and its assets.**
    *   **Cause**: Qdrant, when run correctly, serves its UI from its `/dashboard` path. Requests to the browser URL `/qdrant/dashboard` needed to reach this, and subsequent asset requests (e.g., for `/qdrant/static/css/style.css` in the browser) needed to be correctly translated to paths Qdrant understands (e.g., `/static/css/style.css`).
    *   **Solution**:
        1.  Nginx `location = /qdrant/dashboard { proxy_pass http://qdrant/dashboard; }` to map the desired browser entry point to Qdrant's UI path.
        2.  Nginx `location /qdrant/ { rewrite ^/qdrant/(.*)$ /$1 break; proxy_pass http://qdrant; }` to strip the `/qdrant/` prefix for asset requests, allowing them to be served correctly by Qdrant from its root relative to its `static` folder.

This setup ensures both the backend API and the Qdrant dashboard are accessible through a single entry point (Nginx on port 80), managed within one Docker container, and ready for deployment on Fly.io. 