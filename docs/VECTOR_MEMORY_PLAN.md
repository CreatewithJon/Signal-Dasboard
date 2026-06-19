# Vector Memory Plan — Sovereign OS

> Semantic memory retrieval using embeddings for the Sovereign OS knowledge engine.

_Version: v5.6 (Foundation — Embedding Utility + Schema Prep)_
_Last updated: 2026-06-19_

---

## Overview

Vector Memory adds **semantic search** to the existing memory engine.
Instead of keyword matching alone, the system generates dense vector embeddings
of memory items and uses cosine similarity to find contextually relevant memories —
even when exact keywords don't match.

**What this is NOT:**
- A replacement for the existing deterministic keyword context engine
- A required dependency — the OS works fully without vectors
- Auto-bulk indexing of all memories (intentionally deferred)

**What this IS:**
- An additive layer that enhances memory retrieval quality
- An opt-in, per-item embedding workflow
- A foundation for future semantic AI context injection

---

## Architecture

```
User Query
    │
    ▼
Keyword Context Engine (always runs — lib/memory/context.ts)
    │
    ├── If VECTOR_DB_READY = false: keyword result only
    │
    └── If VECTOR_DB_READY = true:
            │
            ▼
        Embedding Provider (OpenAI text-embedding-3-small)
            │
            ▼
        Supabase pgvector (cosine similarity via match_memories RPC)
            │
            ▼
        Ranked semantic results + keyword results merged
```

---

## Current State (v5.6 — Foundation)

| Component | Status | Notes |
|---|---|---|
| `lib/vector/embedding.ts` | ✅ Built | Server-side OpenAI embedding utility |
| `lib/vector/semanticMemory.ts` | ✅ Built | Semantic search + keyword fallback |
| `app/api/vector/status` | ✅ Built | Reports configuration state to client |
| `app/api/vector/embed` | ✅ Built | On-demand per-item embedding endpoint |
| `components/settings/VectorMemorySettings.tsx` | ✅ Built | Settings panel with test button |
| Memory page "Embed" button | ✅ Built | Shows only when OPENAI_API_KEY configured |
| `supabase/schema.sql` | ✅ Commented | pgvector migration ready to apply |
| Supabase pgvector active | ⏳ Pending | Apply migration when ready |
| Embeddings stored in DB | ⏳ Pending | After pgvector column added |
| Semantic search active | ⏳ Pending | After VECTOR_DB_READY flipped |

---

## Activation Checklist (v5.7)

Complete these steps in order to fully activate semantic search:

### Step 1 — Confirm pgvector availability
```sql
-- In Supabase SQL Editor:
select * from pg_available_extensions where name = 'vector';
```
Should return a row. If not, contact Supabase support.

### Step 2 — Apply the migration
Run the SQL in `supabase/schema.sql` under the `v5.6 — Vector Memory Migration` section:
1. Enable pgvector extension
2. Add `embedding`, `embedding_model`, `embedded_at` columns to `memory_items`
3. Create the `match_memories` RPC function
4. (Optional) Add IVFFlat index after 100+ embeddings exist

### Step 3 — Configure environment variable
```bash
npx vercel env add OPENAI_API_KEY
```

### Step 4 — Flip the feature flags
In `lib/vector/semanticMemory.ts`, change:
```ts
const VECTOR_DB_READY = false;
```
to:
```ts
const VECTOR_DB_READY = true;
```

In `app/api/vector/status/route.ts`, change:
```ts
const vectorDbReady = false;
```
to:
```ts
const vectorDbReady = true;
```

### Step 5 — Index memories
Use the "Embed" button on individual memory items from `/memory` to generate
embeddings one at a time. Start with Critical and High importance items.

### Step 6 — Verify in settings
Go to `/settings → Vector Memory`. Mode should show "Semantic Ready."
Run the "Test Embedding" to confirm end-to-end pipeline.

---

## Embedding Provider

**Provider:** OpenAI  
**Model:** `text-embedding-3-small`  
**Dimensions:** 1536  
**Cost:** ~$0.02 per 1M tokens (very cheap — each memory item ≈ 100–500 tokens)  
**Why not Anthropic:** Anthropic does not expose a public embeddings API as of v5.6.

---

## Text Format

Each memory item is formatted for embedding as:
```
{title}
Type: {type}. Importance: {importance}.
{content}
Tags: {tags}
People: {relatedPeople}
```

Title is first (most semantically significant). Capped at 8,000 characters.

---

## Supabase RPC — match_memories

The `match_memories` Postgres function is called by `searchMemorySemantic()`:
```sql
select * from match_memories(
  query_embedding := [...],  -- 1536-dimensional float array
  match_threshold := 0.7,    -- cosine similarity threshold (0 = unrelated, 1 = identical)
  match_count     := 10      -- max results
);
```

Returns ranked memory IDs which are then joined against the in-memory item list.

---

## Fallback Behavior

At every step, if semantic search is unavailable, the system falls back gracefully:

| Condition | Behavior |
|---|---|
| `OPENAI_API_KEY` not set | Keyword search only, no error |
| pgvector not enabled | Keyword search only, no error |
| Embedding API error | Keyword search, logs reason |
| Supabase RPC error | Keyword search, logs reason |
| Empty query | Returns all items (unranked) |

The user experience degrades gracefully — keyword results are always returned.

---

## Future Phases

**v5.7 — Semantic Activation:**
- Apply pgvector migration
- Flip feature flags
- Batch embed High/Critical memories via a migration script
- Merge semantic + keyword results with score weighting

**v5.8 — Context Injection:**
- `getRelationshipContext()` and `buildCombinedContext()` incorporate semantic hits
- AI assistant automatically uses top-k semantic memories as context
- Chief of Staff brief draws from semantically matched memory

**v5.9 — Auto-embedding:**
- New memory items are embedded automatically on save (background task)
- Re-embed when content is edited
- Embed quality score / staleness tracking

**v6.0 — Cross-entity Semantic Graph:**
- People, Projects, Opportunities, and Content all embedded
- Similarity edges in the Knowledge Graph based on embedding distance
- Cluster detection driven by semantic proximity, not just explicit links

---

## Files

```
lib/vector/
  embedding.ts          — OpenAI embedding utility (server-side)
  semanticMemory.ts     — Semantic search + keyword fallback

app/api/vector/
  status/route.ts       — Configuration status endpoint
  embed/route.ts        — On-demand embedding endpoint

components/settings/
  VectorMemorySettings.tsx  — Settings panel

supabase/
  schema.sql            — Commented pgvector migration (v5.6 section)

docs/
  VECTOR_MEMORY_PLAN.md — This document
```
