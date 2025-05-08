# Plan for Deploying Backend to Fly.io

-   [ ] **1. Install `flyctl` (if not already installed)**
    -   This step is for the user. I will provide instructions if needed.
-   [ ] **2. Log in to Fly.io using `flyctl`**
    -   This step is for the user: `flyctl auth login`.
-   [ ] **3. Create a `Dockerfile` for the backend application.**
    -   I will generate a suitable multi-stage `Dockerfile`.
-   [ ] **4. Create a `fly.toml` configuration file.**
    -   Run `flyctl launch` in the `application/packages/backend` directory. This will detect the `Dockerfile`, ask some questions (app name, region, etc.), and generate a `fly.toml`. I will guide the user through this or make sensible choices if possible, though `flyctl launch` is interactive.
    *Alternatively, if `flyctl launch` is problematic in this environment, I can generate a basic `fly.toml` and the user can adjust it.*
-   [ ] **5. Review and adjust `fly.toml` settings.**
    -   Ensure `internal_port` matches the port the NestJS app listens on (e.g., 3001 or what `PORT` will be set to by Fly.io).
    -   Set up health checks.
    -   Define necessary environment variables (this will be a crucial step for the user).
-   [ ] **6. Set secrets/environment variables on Fly.io.**
    -   The user will need to set secrets for `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, etc., using `flyctl secrets set VARNAME=VALUE`.
-   [ ] **7. Deploy the application.**
    -   Run `flyctl deploy` from `application/packages/backend`.
-   [ ] **8. (Optional) Set up a PostgreSQL database on Fly.io (if not using an external one).**
    -   Fly.io can provision Postgres instances: `flyctl postgres create`.
    -   The user would then need to set the `DATABASE_URL` secret.
-   [ ] **9. (Optional) Set up persistent volume storage (if needed for `audio-storage/impl/local-audio-storage.service.ts` if it's being used in production).**
    -   If local file storage is used for audio and needs to persist across deployments, a Fly.io volume needs to be created and mounted.
-   [ ] **10. Test the deployed application.**
    -   Access the API endpoints on the `.fly.dev` URL.
-   [ ] **11. Monitor logs.**
    -   Use `flyctl logs`. 