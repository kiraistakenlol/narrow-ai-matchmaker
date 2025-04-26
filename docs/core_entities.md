# Core System Entities

This document outlines the primary conceptual data entities within the Narrow AI Matchmaker system.

## 1. User
*   **Purpose:** Represents an individual interacting with the platform.
*   **Key Concepts:** Unique identifier, external identity link (optional), contact information (e.g., email), creation/update timestamps.
*   **Relations:** A User has one Profile. A User participates in zero or more Events via EventParticipation records.

## 2. Onboarding Session
*   **Purpose:** Tracks the process of a User joining a specific Event, capturing initial profile and event context information.
*   **Key Concepts:** Unique identifier, link to the User, link to the Event, links to the Profile and EventParticipation records created during the session, session status (e.g., Started, Processing, Ready, Completed), data completeness indicators, expiry time, creation/update timestamps.
*   **Relations:** Belongs to one User and one Event. Creates one Profile and one EventParticipation record.
*   **Notes:** Acts as a coordinator for the initial data gathering flow for a specific event.

## 3. Profile
*   **Purpose:** Stores the general information about a User, used for matching.
*   **Key Concepts:** Unique identifier, link to the User, structured data representing the user's professional background, skills, goals, etc., data completeness indicator, reference to the original input, timestamp of last update relevant to matching (e.g., embedding update), creation/update timestamps.
*   **Relations:** Belongs to one User. Optionally linked back to the Onboarding Session that created it.
*   **Notes:** Contains the core information used to represent a user across different events.

## 4. Event
*   **Purpose:** Represents a specific context (e.g., conference, hackathon, community) within which matching occurs.
*   **Key Concepts:** Unique identifier, name, description, start/end times, creation/update timestamps.
*   **Relations:** An Event can have many Users participating (via EventParticipation). An Event can be the context for multiple Onboarding Sessions.

## 5. Event Participation
*   **Purpose:** Represents a User's involvement and specific context within a particular Event.
*   **Key Concepts:** Unique identifier, link to the User, link to the Event, structured data representing the user's goals or needs specific to this event, data completeness indicator, timestamp of joining, timestamp of last update relevant to matching for this event, creation/update timestamps.
*   **Relations:** Links one User to one Event. Optionally linked back to the Onboarding Session that created it.
*   **Notes:** Captures the user's intent and context specifically for the associated Event.

## 6. Match Result
*   **Purpose:** Represents a potential connection identified between two Users within the context of an Event.
*   **Key Concepts:** Identifier for the matched user, similarity score, explanation for the match.
*   **Notes:** This is typically a computed result generated on-demand by the matching system based on Profile and Event Participation data, rather than a persistently stored entity in the primary database.

## 7. Reference Data
*   **Purpose:** Defines controlled vocabularies or sets of terms used for consistency (e.g., lists of skills, industries, interests).
*   **Key Concepts:** Set of defined terms within a specific category.
*   **Notes:** Used to structure and normalize information within Profile and Event Participation data. May be stored in separate tables or managed as configuration data. 