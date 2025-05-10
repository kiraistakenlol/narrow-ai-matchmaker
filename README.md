# Narrow AI Matchmaker

A platform leveraging AI and LLMs to facilitate connections between people based on free-form input like audio and text.

## Documentation

### Deployment
- [Backend Deployment](docs/deployment/backend.md): Fly.io deployment, Docker setup, and secrets management
- [Frontend Deployment](docs/deployment/frontend.md): Vercel deployment and configuration
- [Infrastructure](docs/deployment/infrastructure.md): AWS services and external integrations

### Architecture
- [System Overview](docs/architecture/overview.md): High-level system architecture and component interactions

## Setup

1. **Environment Variables**
   - Core application configuration uses root `.env` files
   - Component-specific `.env` requirements in respective READMEs
   - **Important:** Ensure `.env` files are in `.gitignore`

## Project Structure

```
.
├── application/           # Main application code
│   ├── packages/         # Monorepo packages
│   │   ├── backend/     # NestJS backend
│   │   ├── frontend/    # React frontend
│   │   └── common/      # Shared code
│   └── database/        # Database migrations
├── docs/                 # Documentation
│   ├── deployment/      # Deployment guides
│   ├── architecture/    # Architecture docs
│   └── development/     # Development guides
└── infra/               # Infrastructure as Code
    └── terraform/       # Terraform configurations
```

## Development

1. **Backend**
   ```bash
   # From application directory
   ./start-backend.sh
   ```

2. **Frontend**
   ```bash
   # From application/packages/frontend
   npm run dev
   ```

#### Core Concept
A unified platform designed to connect individuals based on diverse needs and goals, moving beyond rigid forms by leveraging AI/LLM analysis of free-form user input (text, audio).

#### Potential Use Cases
The platform's flexibility allows for a wide range of applications:
- **Professional Networking:** Finding hackathon teammates, conference connections, co-founders, mentors, industry peers.
- **Services:** Connecting users with local service providers (nannies, tutors, handymen, etc.).
- **Hobbies & Social:** Matching language exchange partners, running buddies, members for hobby groups, local event attendees.
- **Community Building:** Facilitating connections within specific communities (co-working spaces, alumni groups, local neighborhoods).