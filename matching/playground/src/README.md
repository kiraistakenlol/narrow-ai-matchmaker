# Vector Database Playground

Experimental project to explore AI matching techniques using vector databases.

## Modules

### Backend
- NestJS server
- Creates and manages embeddings
- Interfaces with Qdrant vector database
- Runs on port 3000

### Frontend
- React/Vite application
- Simple UI for testing embedding and search operations
- Runs on port 3001

### Common
- Shared TypeScript interfaces and DTOs
- Ensures consistent types across modules

## Data Flow

1. Frontend submits profile data or queries
2. Backend converts text to embeddings via OpenAI
3. Backend stores/searches vectors in Qdrant
4. Results return to Frontend

## Setup

Run `./setup-modules.sh` to install dependencies. 