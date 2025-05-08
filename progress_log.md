# Vercel Deployment To-Do List

## Phase 1: Preparation

1.  **Vercel Account:**
    *   [ ] Ensure you have a Vercel account (Hobby/Free tier is fine to start). Sign up at vercel.com.
2.  **Git Repository:**
    *   [ ] Confirm your entire monorepo (including `application/packages/frontend` and `application/packages/backend`) is pushed to a Git provider (GitHub, GitLab, or Bitbucket) linked to your Vercel account.
3.  **Monorepo Workspace & TypeScript Project References Setup (Crucial for `frontend` depending on `common`):
    *   [ ] **Monorepo Root `package.json`:** Ensure it defines workspaces (e.g., `"workspaces": ["application/packages/*"]`).
    *   [ ] **`frontend/package.json`:** Ensure the dependency on `@narrow-ai-matchmaker/common` uses the `workspace:` protocol (e.g., `"@narrow-ai-matchmaker/common": "workspace:*"`).
    *   [ ] **`common/tsconfig.build.json` (or `common/tsconfig.json`):** Ensure `compilerOptions` includes `"composite": true` and an appropriate `outDir` (e.g., `"dist"`).
    *   [ ] **`frontend/tsconfig.json`:** Ensure `compilerOptions` includes `"composite": true` and add a project reference: `"references": [{ "path": "../common" }]`. (Adjust path if needed).
4.  **Environment Variables List:**
    *   [ ] Gather all environment variables required for your backend (the extensive list you provided previously: DB credentials, API keys, Cognito settings, etc.). You'll need these for the Vercel backend project settings.
    *   [ ] Identify any frontend-specific environment variables (e.g., `VITE_API_BASE_URL`).

## Phase 2: Frontend Deployment (React/Vite)

1.  **Create New Vercel Project (Frontend):**
    *   [ ] Go to your Vercel dashboard and click "Add New... > Project".
2.  **Import Git Repository:**
    *   [ ] Select your monorepo from the list.
3.  **Configure Project:**
    *   [ ] **Project Name:** Give it a name (e.g., `my-narrow-ai-frontend`).
    *   [ ] **Framework Preset:** Vercel should auto-detect "Vite". If not, select it.
    *   [ ] **Root Directory:** Set this to `application/packages/frontend`.
    *   [ ] **Build and Output Settings:** Vercel usually gets these right for Vite (`tsc -b && vite build` via `npm run build`, output `dist`). The `tsc -b` should handle building the `common` package due to project references.
    *   [ ] **Install Command:** Vercel usually gets this right (`yarn install` or `npm install`). It should handle workspace dependencies.
4.  **Environment Variables (Frontend):**
    *   [ ] Add an environment variable `VITE_API_BASE_URL`. For now, you can put a placeholder value like `http://localhost:3001` or leave it blank. We'll update this after the backend is deployed.
5.  **Deploy Frontend:**
    *   [ ] Click "Deploy".
    *   [ ] Monitor build logs carefully to ensure `common` is built and `frontend` builds successfully.
    *   [ ] Once deployed, Vercel will give you a public URL (e.g., `my-narrow-ai-frontend.vercel.app`). Visit it to ensure the frontend loads (it won't be able to fetch data from the backend yet).

## Phase 3: Backend Deployment (NestJS Monolith as a Single Serverless Function)

**Important Disclaimer:** This approach wraps your entire NestJS app into one serverless function. Be mindful of Vercel's function limits (execution duration, memory, payload size). This is for simplicity; for complex/long-running tasks, consider refactoring or a different backend platform.

1.  **Adapt NestJS for Vercel (Serverless Environment):**
    *   [ ] **Install Adapter:** In your `application/packages/backend` directory, install a suitable adapter:
        ```bash
        cd application/packages/backend
        npm install @vendia/serverless-express
        # or yarn add @vendia/serverless-express
        ```
    *   [ ] **Create Handler File:** Inside `application/packages/backend`, create a new directory `api` and inside it, a file named `index.js` (or `index.ts` if you have a build step for the api directory itself, but JS is often simpler for Vercel's Node.js runtime directly).
        *   **`application/packages/backend/api/index.js` content:**
          ```javascript
          // application/packages/backend/api/index.js
          let serverlessExpressInstance;
          // Import your NestJS app and the serverless-express adapter
          // Adjust path to your main.ts or app module compiled output
          const { AppModule } = require('../dist/app.module'); // Assuming your build output is in 'dist' and AppModule is exported from there
          const { NestFactory } = require('@nestjs/core');
          const { ExpressAdapter } = require('@nestjs/platform-express');
          const serverlessExpress = require('@vendia/serverless-express');

          async function bootstrap() {
            const expressApp = require('express')();
            const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
            // If your backend also depends on the `common` package, its build artifacts should be available
            // due to workspace setup and potentially TypeScript project references if backend uses them.
            await nestApp.init();
            return serverlessExpress({ app: expressApp });
          }

          module.exports = async (req, res) => {
            if (!serverlessExpressInstance) {
              serverlessExpressInstance = await bootstrap();
            }
            return serverlessExpressInstance(req, res);
          };
          ```
        *   **Note:** Ensure your NestJS `main.ts` *does not* call `app.listen()` when intended for serverless. The serverless handler above will manage the server lifecycle. You might need a conditional check or a different entry point for serverless bundling.
        *   Your `tsconfig.json` in `application/packages/backend` should be configured to compile TypeScript to JavaScript (e.g., into a `dist` folder). The build command for backend should handle this.

2.  **Configure Vercel for Backend (`vercel.json`):**
    *   [ ] Create a `vercel.json` file in `application/packages/backend`.
    *   **`application/packages/backend/vercel.json` content:**
      ```json
      {
        "version": 2,
        "builds": [
          {
            "src": "package.json", 
            "use": "@vercel/node",
            "config": {
              "includeFiles": ["dist/**", "api/**", "node_modules/**", "../common/dist/**"] // Ensure common package's dist is available if directly referenced post-build
            }
          }
        ],
        "functions": {
          "api/index.js": {
            "memory": 1024, 
            "maxDuration": 10 
          }
        },
        "rewrites": [
          { "source": "/api/(.*)", "destination": "/api/index" }
        ]
      }
      ```
      *   **Note on `includeFiles`:** If the `common` package is correctly linked via `node_modules` by the workspace installer, explicitly adding `../common/dist/**` might not be strictly necessary, but can be a fallback. The ideal is that imports from `@narrow-ai-matchmaker/common` resolve through `node_modules`.

3.  **Create New Vercel Project (Backend):**
    *   [ ] Go to your Vercel dashboard and click "Add New... > Project".
    *   [ ] Select the same monorepo.
4.  **Configure Project:**
    *   [ ] **Project Name:** Give it a name (e.g., `my-narrow-ai-backend`).
    *   [ ] **Framework Preset:** Select "Other".
    *   [ ] **Root Directory:** Set this to `application/packages/backend`.
    *   [ ] **Build and Output Settings:**
        *   **Build Command:** `npm run build` (or `yarn build`) - this should compile your TS to JS into the `dist` folder.
        *   **Output Directory:** Leave blank (Vercel will use the serverless functions defined).
        *   **Install Command:** Vercel usually gets this right.
5.  **Environment Variables (Backend):**
    *   [ ] In the Vercel project settings for the backend, add ALL the environment variables your NestJS application needs.
6.  **Deploy Backend:**
    *   [ ] Click "Deploy".
    *   [ ] Monitor the build logs for any errors. Check if `common` is built and accessible.
    *   [ ] Once deployed, Vercel will give you a URL (e.g., `my-narrow-ai-backend.vercel.app`). Your API should be accessible under `/api/...`. Test a few endpoints.

## Phase 4: Integration & Final Steps

1.  **Update Frontend API Base URL:**
    *   [ ] Go to your Vercel frontend project's settings.
    *   [ ] Update the `VITE_API_BASE_URL` environment variable to the deployed backend URL (e.g., `https://my-narrow-ai-backend.vercel.app`).
2.  **Redeploy Frontend:**
    *   [ ] Trigger a new deployment for the frontend project in Vercel.
3.  **Test Full Application:**
    *   [ ] Thoroughly test the frontend interacting with the backend.
4.  **Custom Domains (Optional):**
    *   [ ] Once everything is working, you can assign custom domains to both your frontend and backend projects through the Vercel dashboard.

This list covers the main steps. The backend adaptation is the most "hustle" part here. Good luck!

TODO:

- Review infra/terraform/ec2_backend_deployment_plan.md and make sense of working with EC2

t