# SIMTAC AI Scenario Builder

Professional web app for creating medical/surgical simulation scenarios with:
- Two creation modes: `Create with AI` and `Fill Worksheet`
- Dynamic SIMTAC worksheet editing (add/remove rows)
- Strict SimMan capability validation with alternatives
- Built-in medical image generation and iterative refinement for scenario appendix
- OpenAI vector store-backed reference retrieval
- Passcode-protected knowledge library upload/delete
- DOCX export for downstream editing

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- OpenAI Responses API + File Search + Vector Stores
- `docx` for Word export
- `mammoth` / `pdf-parse` for document extraction
- Vitest + Playwright

## Quick Start
1. Install dependencies:
```bash
pnpm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Set required env values in `.env.local`:
- `OPENAI_API_KEY`
- `OPENAI_VECTOR_STORE_ID` (after bootstrap, or set later)
- `OPENAI_IMAGE_MODEL` (optional, default `gpt-image-1.5`)
- `KNOWLEDGE_ADMIN_PASSCODE`
- `SITE_ACCESS_PASSWORD` (set to `humeaine` unless you want a different site password)

4. Start dev server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Knowledge Bootstrap
Run one-time core document ingestion for the four SIMTAC reference files in `Resources/`:

```bash
pnpm ingest:knowledge
```

If `OPENAI_VECTOR_STORE_ID` is missing, the script creates one and prints the value to add to env.

## Scripts
- `pnpm dev` - run local app
- `pnpm build` - production build
- `pnpm start` - run built app
- `pnpm lint` - lint code
- `pnpm test` - run unit + integration tests with coverage
- `pnpm test:e2e` - run Playwright E2E
- `pnpm ingest:knowledge` - ingest core references into vector store
- `pnpm ingest:references` - ingest extended reference case files into vector store

## API Endpoints
- `POST /api/scenario/generate`
- `POST /api/scenario/fill-section`
- `POST /api/scenario/validate`
- `POST /api/scenario/export-docx`
- `POST /api/imagegen/generate`
- `GET /api/knowledge/files` (admin passcode)
- `POST /api/knowledge/upload` (admin passcode)
- `DELETE /api/knowledge/files/:fileId` (admin passcode)

Passcode can be supplied via header `x-admin-passcode`.

## Vercel Deployment
1. Import this project in Vercel.
2. Set environment variables:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-5.2`)
- `OPENAI_VECTOR_STORE_ID`
- `OPENAI_IMAGE_MODEL` (optional, default `gpt-image-1.5`)
- `KNOWLEDGE_ADMIN_PASSCODE`
- `SITE_ACCESS_PASSWORD`
3. Deploy.

## Notes
- The app uses no database.
- Scenario state is saved in browser localStorage.
- Knowledge persistence is handled in OpenAI vector store.
