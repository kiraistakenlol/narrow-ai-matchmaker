# Flexible User Matching Architecture

## Overview

This document outlines the architecture for a flexible user matching system that adapts to both user profile updates and different event contexts, enabling more accurate and contextual matches.

## Core Components

### 1. User Profile

- Persistent storage of user information in a traditional database
- Contains basic user data (name, email, etc.)
- Stores the current comprehensive user description in natural language
- References to derived vectors in the vector database

### 2. Vector Database (Qdrant)

- Stores and indexes user vectors for similarity search
- Maintains multiple vector types per user:
  - General profile vector (overall user representation)
  - Event-specific vectors (user in context of specific events)
  - Domain-specific vectors (goals, hobbies, etc.)

### 3. Participant Entity

- Represents a user in the context of a specific event
- Connects users to events with event-specific data
- Contains event-specific goals, expectations, and preferences
- Serves as the basis for event-contextual matching

## Data Flows and Processes

### Profile Update Cycle

```
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │         │                     │
│  Current User       │         │  User Profile       │         │  General Vector     │
│  Description        │ ──────> │  Update             │ ──────> │  in Qdrant          │
│  (Natural Language) │         │  (LLM Processing)   │         │  (Vector Embedding) │
│                     │         │                     │         │                     │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
          ▲                                 │                              │
          │                                 │                              │
          └─────────────────────────────────┘                              │
                      Updates Description                                  │
                                                                           │
                                                                           ▼
                                                                ┌─────────────────────┐
                                                                │                     │
                                                                │  Similarity Search  │
                                                                │  (General Matching) │
                                                                │                     │
                                                                └─────────────────────┘
```

1. **Initial State**:
   - User has a natural language profile description
   - This description is embedded as a vector in Qdrant

2. **Update Process**:
   - New information about the user is received
   - LLM combines current description with new information
   - LLM generates updated comprehensive description
   - Profile database stores new description
   - New vector embedding replaces the old one in Qdrant

3. **Benefits**:
   - Maintains human-readable profile description
   - Vector always represents current user state
   - Sequential updates preserve context without vector drift

### Event-Specific Matching

```
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │         │                     │
│  General User       │         │  Participant        │         │  Event-Specific     │
│  Description        │ ──────> │  Creation           │ ──────> │  Vector in Qdrant   │
│  (Natural Language) │         │  (User + Event)     │         │  (Vector Embedding) │
│                     │         │                     │         │                     │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
                                          ▲                                │
                                          │                                │
                                          │                                │
                                ┌─────────────────────┐                    │
                                │                     │                    │
                                │  Event-Specific     │                    │
                                │  User Goals/Context │                    │
                                │                     │                    │
                                └─────────────────────┘                    │
                                                                           ▼
                                                                ┌─────────────────────┐
                                                                │                     │
                                                                │  Contextual Search  │
                                                                │  (Event Matching)   │
                                                                │                     │
                                                                └─────────────────────┘
```

1. **Participant Creation**:
   - When user joins an event, a Participant entity is created
   - Participant combines:
     - General user profile description
     - Event-specific goals and expectations
   - LLM blends these into a contextual description
   - New event-specific vector is created in Qdrant

2. **Contextual Matching**:
   - Matches use the event-specific vectors
   - Searches filtered by event ID
   - Multiple vector types can be used with different weights:
     - Event goals vector (higher weight)
     - General profile vector (lower weight)

3. **Benefits**:
   - Users can have different matching priorities in different events
   - Matching respects event context
   - Same user can participate in multiple events with different matching preferences

## Implementation Considerations

### Vector Database Structure

- **Points**: Each user has multiple vector points in Qdrant
  - One general vector (updated with profile changes)
  - One or more event-specific vectors (created per event)
  - Optional domain-specific vectors (goals, interests, etc.)

- **Payload**: 
  - `user_id`: Reference to the user
  - `event_id`: For event-specific vectors
  - `vector_type`: "general", "event_specific", "goals", etc.
  - `updated_at`: Timestamp for tracking freshness

### Matching Strategies

1. **General Matching**:
   - Uses general vectors
   - For platform-wide recommendations

2. **Event Matching**:
   - Uses event-specific vectors
   - Filtered by event_id
   - Can combine multiple vector types with weights

3. **Criteria-Focused Matching**:
   - Uses domain-specific vectors (goals, hobbies)
   - For matching on specific dimensions

4. **Multi-vector Matching**:
   - Combines results from multiple vector searches
   - Applies custom weighting based on user preferences

### Performance Optimizations

- Use Qdrant's payload filtering to restrict searches by event
- Create appropriate indexes on frequently filtered fields
- Consider using Qdrant's named vectors feature for multiple vector types per point
- Implement caching for frequently requested matches

## Conclusion

This architecture provides a flexible foundation for matching users across different contexts. By maintaining both natural language descriptions and vector representations, the system combines human readability with efficient similarity search. The Participant entity enables event-specific matching while still leveraging the user's general profile information. 