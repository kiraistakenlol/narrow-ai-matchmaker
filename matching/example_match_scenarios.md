# Example Match Scenarios

This document outlines concrete examples of user profiles and the desired matching outcomes. These scenarios help define requirements, test matching logic, and illustrate different matching dimensions (location, skills, goals, interests, complementarity, context).

---

## Scenario 1: Complementary Skills/Needs (Founder & Developer)

*   **User A:** "Experienced backend developer (Python, AWS), looking to join an early-stage startup in fintech."
*   **User B:** "Founder of a new fintech startup focused on international payments. Seeking a technical co-founder or early engineer with backend expertise."
*   **Desired Match:** A <-> B (High Relevance)
*   **Reason:** Complementary roles (developer seeking startup role, founder seeking developer) in a shared specific domain (fintech). Highlights matching based on *needs* and *goals*.

---

## Scenario 2: Shared Location & Broad Interest (Local Connection)

*   **User A:** "Designer based in Buenos Aires for the next few months, looking to meet people and explore collaborations."
*   **User B:** "Living in Buenos Aires, work in marketing, love cats and exploring the city's cafes."
*   **Desired Match:** A <-> B (Moderate Relevance)
*   **Reason:** Shared current location (`Buenos Aires`). User A expresses general openness to meeting people. Less specific than Scenario 1, tests location-based matching and handling broader interests.

---

## Scenario 3: Shared Niche Interest (Hobby)

*   **User A:** "Software engineer, recently moved to London. Big fan of board games, especially complex Euros like Brass: Birmingham."
*   **User B:** "Product Manager in London. Always looking for people to play heavy board games with. Have a large collection."
*   **Desired Match:** A <-> B (High Relevance for Hobby)
*   **Reason:** Shared specific niche hobby (`heavy board games`, specific game mentioned implies interest) and shared location (`London`). Tests matching on specific interests beyond professional goals.

---

## Scenario 4: Event-Specific Goal (Conference Networking)

*   **Context:** All users associated with `event_id = 'ai_dev_summit'`
*   **User A:** "Attending 'AI Dev Summit'. Interested in discussing productionizing LLMs. Role: ML Engineer."
*   **User B:** "Speaking at 'AI Dev Summit' about deploying LLMs reliably. Role: Head of MLOps."
*   **User C:** "Frontend developer also attending 'AI Dev Summit', looking for UI/UX design inspiration."
*   **Desired Match:** A <-> B (High Relevance); A <-/-> C (Low Relevance)
*   **Reason:** Shared specific technical interest (`productionizing/deploying LLMs`) within the context of the same event. User C has different goals for the event. Tests context-based filtering and topic relevance.

---

## Scenario 5: Mentorship Seeker & Potential Mentor

*   **User A:** "Junior frontend developer, learning React and Typescript. Looking for advice on breaking into senior roles."
*   **User B:** "Senior Staff Engineer with 10+ years experience, expert in React/Typescript frontend architectures. Happy to mentor occasionally."
*   **Desired Match:** A <-> B (High Relevance)
*   **Reason:** Clear complementary relationship (seeking mentorship vs. potentially offering mentorship) in a specific, shared technical domain. Tests identification of asymmetrical but complementary roles/goals.

---

## Scenario 6: Differing Detail Levels (Location Match Test)

*   **User A:** "I'm a designer with 6 years of experience. I'm gonna be in Buenos Aires for a couple of weeks starting from May 2025. I'm looking for new ideas to share experience. I'm open to join a team, a startup. I'm also open to a new role as a freelancer."
*   **User B:** "Okay, I am in Buenos Aires, and I love cats."
*   **Desired Match:** A <-> B (Low to Moderate Relevance)
*   **Reason:** Tests the system's ability to identify a match based *primarily* on a single shared attribute (location: `Buenos Aires`) even when other profile details are sparse (User B) or largely non-overlapping. Useful for understanding baseline location matching.

---

## Scenario 7: Implicit Complementarity (Problem & Solution Domain)

*   **User A:** "Working on scaling real-time data pipelines for IoT sensor networks. Facing challenges with managing high throughput and ensuring low latency."
*   **User B:** "Expert in stream processing frameworks like Kafka and Flink. Consults on optimizing high-throughput, low-latency data systems."
*   **Desired Match:** A <-> B (High Relevance)
*   **Reason:** User A describes a problem domain where User B has expertise and offers solutions. No explicit 'seeking' or 'offering' keywords, relies on semantic understanding of the problem/solution space.

---

## Scenario 8: Language Exchange

*   **User A:** "Native English speaker living in Medellín, trying to improve my Spanish conversational skills. Happy to help someone practice English in return."
*   **User B:** "Colombian living in Medellín, fluent in Spanish. Need to practice my English speaking for work. Intermediate level."
*   **Desired Match:** A <-> B (High Relevance)
*   **Reason:** Explicit, reciprocal desire for language practice involving specific languages (English/Spanish) and shared location (`Medellín`). Tests matching on language skills and goals.

---

## Scenario 9: Investor <> Startup

*   **User A:** "Founder of 'HealthTrack', an early-stage startup using wearables for preventative healthcare. Seeking $250k seed funding."
*   **User B:** "Angel investor actively deploying capital in the digital health / MedTech space. Typical check size $50k-$300k. Focus on seed stage."
*   **Desired Match:** A <-> B (High Relevance)
*   **Reason:** Clear match between startup's funding need (stage, amount, sector) and investor's focus area. Tests matching in the investment domain.

---

## Scenario 10: Skill Exchange (Peer-to-Peer)

*   **User A:** "Strong Python backend developer, but my UI skills are basic. Would love to trade backend lessons for help understanding modern frontend design principles."
*   **User B:** "Experienced UI/UX designer using Figma. Curious about how backend APIs work to better inform my designs. Open to skill swapping."
*   **Desired Match:** A <-> B (Moderate to High Relevance)
*   **Reason:** Reciprocal interest in exchanging specific, complementary skills on a peer-to-peer basis, distinct from mentorship.

---

## Scenario 11: Group Formation (Hackathon Team - More Complex)

*   **Context:** `event_id = 'global_hack_week'`
*   **User A:** "Backend dev (Node.js, Postgres) looking for a team for Global Hack Week. Interested in social good projects."
*   **User B:** "Frontend dev (React, Tailwind) attending Global Hack Week, wants to join a team. Ideas around community building."
*   **User C:** "UI/UX Designer looking for a hackathon team for Global Hack Week. Portfolio focuses on clean mobile interfaces."
*   **User D:** "Another backend dev (Python, Flask) looking for team."
*   **Desired Match:** Suggest {A, B, C} form a balanced team. Potentially suggest A or D could join B+C. (Note: This goes beyond simple pairwise matching).
*   **Reason:** Identifying multiple users with complementary roles (backend, frontend, design) needed for a typical hackathon team, all sharing the event context and goal ("looking for team"). Tests a more advanced group recommendation capability.

---

## Scenario 12: Negative Constraint / Avoidance

*   **User A:** "Senior ML Engineer looking for full-time roles in established tech companies. Specifically *not* interested in early-stage startups or contract work."
*   **User B:** "Recruiter for various early-stage startups, often seeking contract ML engineers."
*   **Desired Match:** A <-/-> B (Explicitly Avoid)
*   **Reason:** User A has stated a clear negative preference that User B's profile/goal directly contradicts. Tests the system's ability to respect avoidance criteria, preventing irrelevant matches.

---

*(Add more scenarios as needed)* 