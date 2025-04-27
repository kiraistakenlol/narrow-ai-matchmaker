# Technology Stack Decisions

This document outlines the chosen technology stack for the Narrow AI Matchmaker project.

## Overall

*   **Language:** TypeScript (for both frontend and backend)

## Frontend

*   **Framework/Library:** React
*   **Build Tool/Dev Environment:** Vite
*   **Language:** TypeScript

## Backend

*   **Runtime:** Node.js
*   **Framework:** NestJS
*   **Language:** TypeScript
*   **Database ORM:** TypeORM

## Databases

*   **Relational Database:** PostgreSQL
*   **Vector Database:** Qdrant (Cloud)

## Database Schema Management (Development)

*   **Approach:** Manual DDL Scripts
*   **Process:** Database schema changes during development will be managed by manually writing and applying SQL DDL scripts.
*   **Tooling Note:** TypeORM will be configured **not** to automatically synchronize or modify the database schema (i.e., `synchronize: false` and migrations will not be used during active development).

## Infrastructure Management

*   **Tool:** Terraform
*   **Provider:** AWS
*   **Purpose:** Managing AWS cloud resources (e.g., RDS, S3, compute instances, networking). 