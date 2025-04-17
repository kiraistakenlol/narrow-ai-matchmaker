## 1. **LLM (like GPT)**
- Transcribes voice/audio into text.
- Pulls out key info like skills, interests, and work background.
- Creates a short, meaningful summary of the person.

### 2. **Vector Database**  
*(FAISS, Pinecone, etc.)*
- Stores semantic vector representations of user profiles.
- Lets you search by meaning — not just exact keywords.
- Super flexible: doesn't require a strict schema.

### 3. **Graph Database**  
*(Neo4j, etc.)*
- Stores connections between people, companies, interests, skills, etc.
- Great for "friend of a friend" logic or shared projects.
- Helps build and explore deeper networks and hidden links.

---

## **How It All Works Together**

1. A user records a short audio intro about themselves.
2. The LLM transcribes and extracts key data.
3. That data gets embedded as a vector and stored in the vector DB.
4. At the same time, a graph is built:
   - Nodes = people, companies, skills, interests.
   - Edges = relationships between them.
5. When someone searches or matches, the system:
   - First looks for semantic matches using the vector DB.
   - Then uses the graph DB to dive deeper into indirect connections or add filters.

---

## **Cool Features**

- No forms or rigid onboarding — just talk.
- Semantic search means natural and flexible matching.
- You can weigh what matters most (skills > hobbies, for example).
- Easily scalable and adaptable for different events or communities.

--- 