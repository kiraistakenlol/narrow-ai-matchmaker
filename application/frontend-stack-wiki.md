# Understanding Your Node.js/TypeScript Monorepo

This document summarizes key concepts about setting up and working with a Node.js/TypeScript monorepo, focusing on npm workspaces, TypeScript project configurations, and build processes.

## 1. Monorepo & npm Workspaces

*   **Monorepo:** A single version control repository containing multiple distinct projects/packages (e.g., `common`, `backend`, `frontend`).
*   **npm Workspaces:** npm's feature to manage monorepos, declared in the root `package.json` via the `"workspaces": []` field.
    *   **Benefits:**
        *   **Simplified Dependency Management:** Single `npm install` from the root. Dependencies can be "hoisted" to the root `node_modules` to save space and ensure consistency.
        *   **Local Linking:** Packages within the monorepo can depend on each other (e.g., `backend` using `common`). Npm workspaces create symlinks so local code is used during development.
        *   **Streamlined Commands:** Run npm scripts across all packages from the root (e.g., `npm run build -ws`).

## 2. TypeScript Configuration (`tsconfig.json`)

*   **`tsconfig.base.json` (Root Level):**
    *   Contains common `compilerOptions` inherited by all packages.
    *   Packages use `"extends": "../../tsconfig.base.json"` (or relative path) to inherit these settings.
    *   Typically does *not* have `"composite": true`. Should *not* have `"incremental": false` if sub-projects use `composite: true` (as `composite` implies `incremental`).

*   **Package-Specific `tsconfig.json` (e.g., `packages/common/tsconfig.json`):**
    *   Extends the `tsconfig.base.json`.
    *   Defines settings specific to that package.
    *   **`"composite": true`:**
        *   Crucial for packages that are part of a project reference setup.
        *   Enables TypeScript's "project references" feature.
        *   Implicitly sets `"incremental": true` for that project, causing a `.tsbuildinfo` file to be generated for faster subsequent builds.
        *   Requires `"declaration": true` (TypeScript generates `.d.ts` files).
    *   **`"references": [{ "path": "../common" }]`:**
        *   Used in a dependent package (e.g., `backend/tsconfig.json`) to point to a dependency package (`common`).
        *   Tells `tsc -b` about the dependency relationships.
    *   **`"outDir": "./dist"`:** Specifies the output directory for compiled JavaScript.
    *   **`"rootDir": "./src"`:** Specifies the root of the source TypeScript files.

*   **`tsconfig.build.json` (Optional, per Package):**
    *   Extends the package's main `tsconfig.json` (e.g., `"extends": "./tsconfig.json"`).
    *   Used for specific build tasks, often to modify options like `exclude` (e.g., to exclude test files from a production build: `"exclude": ["**/*.spec.ts", "**/*.test.ts"]`).
    *   Invoked via `tsc -p tsconfig.build.json`.

## 3. Build Process

*   **`tsc` (TypeScript Compiler):**
    *   Compiles `.ts` files to `.js` files.
    *   Uses the version installed locally in the project's `node_modules/.bin` when run via npm scripts.
*   **`tsc -b` (or `tsc --build`):**
    *   Used to build projects with project references.
    *   Reads `tsconfig.json` files to understand the dependency graph.
    *   Builds dependencies first.
    *   Uses `.tsbuildinfo` files for incremental builds, only recompiling what's necessary.
*   **Library Packages (e.g., `common`):**
    *   Build script is often a direct `tsc` call (e.g., `tsc -p tsconfig.build.json`).
    *   Focuses on compiling TS to JS and generating `.d.ts` files.
*   **Application Packages (e.g., `backend` using NestJS):**
    *   Build script often uses a framework-specific command (e.g., `nest build`).
    *   `nest build` uses `tsc` under the hood but also handles framework-specific tasks (decorators, potential bundling via Webpack).
    *   Application build scripts often explicitly build their internal dependencies first (e.g., `npm run build --prefix ../common && nest build`).

## 4. `.tsbuildinfo` Files

*   Generated when `incremental: true` is effectively set (e.g., by `composite: true` or the `--incremental` flag).
*   Stores metadata about a compilation (file versions, output signatures).
*   Enables `tsc` to perform faster incremental builds by only recompiling changed files and their dependents.
*   **Important:** These are build artifacts and should be in `.gitignore`.
*   If you manually delete an output directory (e.g., `dist/`) without also deleting the corresponding `.tsbuildinfo` file, `tsc -b` might mistakenly believe the outputs are still present, leading to errors in dependent projects.

## 5. Common Issues & Best Practices

*   **"Cannot find module X or its corresponding type declarations":**
    *   Often means a dependency package (like `common`) hasn't been built yet, so its `dist` folder (with `.js` and `.d.ts` files) is missing.
    *   Ensure the dependent package's `tsconfig.json` has a correct `references` entry.
    *   Ensure the dependency package's `tsconfig.json` has `composite: true` and `declaration: true`.
*   **"Composite projects may not disable incremental compilation":**
    *   Occurs if a `tsconfig.json` has `composite: true` but inherits `incremental: false` (e.g., from a `tsconfig.base.json`).
    *   Fix by removing `incremental: false` from the base config, allowing `composite: true` to imply `incremental: true`.
*   **Clean Builds:**
    *   Implement `clean` scripts in `package.json` to remove `dist` directories and `.tsbuildinfo` files.
        *   Example: `"clean": "rm -rf dist tsconfig.tsbuildinfo"`
    *   Run `npm run clean && npm run build` for a truly fresh build, especially when troubleshooting.

## 6. Vite (Not currently in your backend/common setup)

*   Primarily a **frontend build tool and development server** known for speed.
*   Not typically used directly for Node.js backend services like NestJS, which have their own build systems.
*   If used in a frontend package, Vite would handle its dev server and build its static assets for production (which could then be served by Nginx, for example).
*   Nginx often acts as a reverse proxy for a Node.js backend in production, not for serving its compiled JS files directly.

This summary should help you recall the main points of our discussion. Refer to official TypeScript and NestJS documentation for more in-depth information. 