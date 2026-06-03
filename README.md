# BookLeaf Publishing — AI Customer Query Bot

**Technical Assignment Submission**
AI Automation Specialist Role — BookLeaf Publishing

---

## What This Does

An AI-powered customer support bot for BookLeaf Publishing that:

- Accepts natural language queries from authors (email, WhatsApp, web)
- Matches queries to author records in a mock Supabase database
- Responds with accurate status info (book live date, royalty, ISBN, add-ons, etc.)
- Escalates to human agents when confidence < 80%
- Logs every query and response to a persistent store
- Includes Identity Unification logic (Task 2)

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Backend | Node.js + Express | Lightweight, fast, perfect for API-first bots |
| AI / NLP | OpenAI GPT-4o-mini | Accurate query interpretation + response generation |
| Fallback NLP | Rule-based keyword classifier | Works even without OpenAI key; resilient |
| Database | Mock JSON (Supabase-compatible) | Mirrors real Supabase schema; swap in 1 line |
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies, instant load, runs anywhere |
| Identity | Custom Jaro-Winkler fuzzy matcher | No external dep needed; explainable scores |

---

## Project Structure

```
bookleaf-query-bot/
├── src/
│   ├── server.js          # Express API server — all routes + AI logic
│   └── identity.js        # Identity unification module (Task 2)
├── public/
│   └── index.html         # Full chat UI — open in browser, no build step
├── .env.example           # Environment variable template
├── package.json
└── README.md
```

---

## Setup & Run

### Prerequisites
- Node.js 18+ (uses ES modules)
- (Optional) OpenAI API key

### Steps

```bash
# 1. Clone / unzip the project
cd bookleaf-query-bot

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY (optional — bot works without it)

# 4. Start the server
npm start
# → Running at http://localhost:3001

# 5. Open the chat UI
# Navigate to http://localhost:3001 in your browser
```

### Without a server (standalone UI)
Just open `public/index.html` in any browser — it has full chat functionality built in using the rule-based engine. No server needed for demo purposes.

---

## API Endpoints

### `POST /api/query`
Main query endpoint.

**Request:**
```json
{
  "query": "Is my book live yet?",
  "email": "priya.sharma@gmail.com",
  "useAI": true
}
```

**Response:**
```json
{
  "response": "Great news! Your book \"Echoes of Dawn\" went live on 2025-01-20...",
  "intent": "book_live",
  "confidence": 87,
  "escalated": false,
  "authorFound": true,
  "authorName": "Priya Sharma",
  "bookTitle": "Echoes of Dawn"
}
```

### `GET /api/authors`
Returns all author profiles (sanitized).

### `GET /api/author/:email`
Returns full record for a specific author email.

### `GET /api/logs`
Returns all query logs (newest first).

---

## Mock Database

5 author records covering all publishing stages:

| Author | Book | Stage | Royalty |
|---|---|---|---|
| Priya Sharma | Echoes of Dawn | Live | Paid ₹4,200 |
| Rahul Verma | The Last Monsoon | Live | Pending |
| Ananya K. | Between Two Rivers | Processing | Not Generated |
| Deepak Nair | Shadows & Silence | Live | Paid ₹2,800 |
| Sara Johnson | Petals in the Wind | Processing | Under Review |

---

## AI Pipeline

```
User Query
    ↓
Keyword Classifier → Intent + Confidence Score
    ↓
If confidence < 80% → ESCALATE (human handoff)
    ↓
Author Matcher (email > book title > fallback)
    ↓
If author not found → REQUEST EMAIL + ESCALATE
    ↓
OpenAI GPT-4o-mini (if key present) → Natural response
    ↓                        ↓ fallback
Rule-based response builder (if OpenAI unavailable)
    ↓
Log query + response to store
    ↓
Return structured JSON response
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| DB is down / unavailable | Falls back to "cannot retrieve data" message + escalation |
| Author email not found | Asks for registered email; escalates |
| Multiple potential matches | Returns best match; logs confidence |
| Low confidence query | Escalates to human agent |
| OpenAI API unavailable | Falls back to rule-based responses |
| Empty query | Returns 400 with clear error message |

---

## Task 2: Identity Unification

See `src/identity.js` for the full implementation.

### How it works

The system collects identity signals from different platforms and assigns confidence scores:

| Signal | Method | Weight |
|---|---|---|
| Email exact match | String equality | 99% |
| Phone number | Normalization + exact | 97% |
| Full name | Jaro-Winkler similarity | 70–95% |
| Dashboard name | Token matching (handles abbreviations) | 60–85% |
| Instagram handle | Handle-to-name fuzzy match | 30–75% |

**Confidence threshold: 80%**
- ≥ 80%: Auto-link identity to profile
- < 80%: Flag for manual review

### Example (Sara Johnson across platforms)

| Platform | Input | Confidence | Action |
|---|---|---|---|
| Email | sara.johnson@xyz.com | 99% | Auto-link |
| WhatsApp | +91 9876543210 | 97% | Auto-link |
| Dashboard | Sara J. | 72% | Manual review |
| Instagram | @sarapoetry23 | 45% | Manual review |

---

## What I Would Improve With More Time

1. **Real Supabase integration** — swap 5 lines in server.js for actual `@supabase/supabase-js` queries
2. **Multi-turn conversation memory** — maintain context across messages (LangChain ConversationChain)
3. **WhatsApp + email webhooks** — Twilio for WhatsApp, Gmail/SendGrid webhooks → same `/api/query` endpoint
4. **Vector embeddings** — embed the knowledge base with OpenAI + pgvector for RAG-based answers on policy questions
5. **Better identity unification** — integrate with a proper ML model (e.g., dedupe library) and phone-to-author carrier lookup
6. **Admin dashboard** — view all authors, query trends, escalation queue, resolution status
7. **Rate limiting + auth** — JWT tokens per author, prevent abuse

---

## Self-Rating

| Area | Rating | Notes |
|---|---|---|
| Zapier / Make / n8n | 6/10 | Comfortable with Make + Zapier; n8n for complex flows |
| LangChain / OpenAI integrations | 8/10 | Built multiple production chatbots |
| System design & troubleshooting | 8/10 | Strong in API design, error handling, fallback logic |

---

## Contact

Submission to: hr@bookleafpub.in
CC: shivangiverma@bookleafpub.in, musavir@bookleafpub.in
