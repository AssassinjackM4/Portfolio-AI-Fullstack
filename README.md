# HireMe AI — Portfolio Agent Team

An AI portfolio assistant that lets recruiters ask questions about a candidate's resume. It combines section-aware retrieval-augmented generation (RAG), a supervisor-style question router, four focused specialist agents, and a React chat interface that shows the resume evidence behind each answer.

## Features

- **Resume upload:** upload a PDF in the browser; the API enforces a 10 MB limit and checks the PDF signature.
- **Section-aware chunking:** extract text with PyPDF, group it under recognizable resume headings, and split long sections into chunks of at most 180 words with 30 words of overlap.
- **Persistent vector retrieval:** index resume excerpts in a local Chroma database using Chroma's default sentence-transformer embedding function. The index is keyed by the resume content hash and stored under `backend/uploads/.chroma`.
- **Relevant evidence:** retrieve candidate excerpts with vector similarity, re-rank results using query-term overlap, and provide up to three evidence excerpts to the answer model.
- **Four specialist agents:** a deterministic supervisor routes each question to a recruiter, technical skills, project, or career specialist. Each specialist has focused instructions and uses the same configured Groq model.
- **Grounded answers and visible citations:** the model is instructed to answer from the retrieved excerpts only. The chat displays the selected specialist and lets the recruiter inspect source sections and excerpts.
- **Input and failure handling:** question length is limited, missing or unreadable resumes return explicit HTTP errors, and missing provider configuration or provider failures are reported rather than returned as successful answers.
- **Responsive frontend:** React, Vite, Tailwind CSS, Framer Motion, and Lucide icons.

## Architecture

```text
Recruiter
   │
   ▼
React + Vite chat ── POST /chat ──► FastAPI
                                      │
                            Read uploaded/default PDF
                                      │
                         Chunk by resume section
                                      │
                       Embed/search with Chroma
                                      │
                           Rank evidence excerpts
                                      │
                       Supervisor routes question
                    ┌─────────┬────────┼────────┐
                    ▼         ▼        ▼        ▼
                Recruiter  Technical  Project  Career
                    └─────────┴────────┴────────┘
                                      │
                               Groq chat model
                                      │
                 Answer + agent name + source excerpts
                                      │
                                      ▼
                    Chat UI renders answer and evidence
```

The supervisor currently uses explicit keyword rules in `backend/agents.py`; it does not use LangGraph or ask an LLM to select an agent. The four specialist roles are prompt configurations over the shared Groq model, not four separately hosted models.

## Requirements

- Python 3.11 or newer
- Node.js and npm
- A Groq API key
- Internet access on the first Chroma embedding-model use so Chroma can download its default embedding model

## Local setup

### 1. Configure the backend

In PowerShell:

```powershell
cd backend
uv sync --locked
Copy-Item env.example .env
```

Edit `backend/.env` and set `GROQ_API_KEY` to your own key. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`; change it if your Groq account uses a different supported model.

Do not put the key in frontend environment variables, source code, screenshots, chat messages, or commits. **Important:** `backend/.env` is currently tracked by Git in this repository. The ignore rule prevents future untracked `.env` files from being added, but Git continues tracking a file that was already tracked. Before committing, remove the local secret from version control while preserving your local copy:

```powershell
git rm --cached backend/.env
git commit -m "Stop tracking local backend credentials"
```

If a real key has already been pushed to a remote repository or shared, revoke/rotate it in Groq and update the local `.env`. Removing a file in a later commit does not remove it from Git history.

### 2. Install and configure the frontend

In a second PowerShell terminal:

```powershell
cd frontend
npm install
```

For local development the frontend uses `http://localhost:8000` by default. For a deployed frontend, set `VITE_API_URL` to the public backend URL in the frontend hosting provider. This value is public configuration, not a secret.

### 3. Start both services

Backend terminal:

```powershell
cd backend
uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The backend health endpoint is `http://localhost:8000/`.

The backend uses `backend/my_resume.pdf` as its default resume when no uploaded filename is supplied. Alternatively, upload a PDF using the **Upload Resume** button before asking questions.

## API

### `GET /`

Health response with the service status and available specialist agents.

### `POST /upload-resume`

Multipart form upload with a `file` PDF field.

Example response:

```json
{
  "message": "Resume uploaded successfully.",
  "filename": "candidate_resume.pdf",
  "status": "uploaded"
}
```

### `POST /chat`

Request body:

```json
{
  "question": "What Python experience does the candidate have?",
  "resume_file": "candidate_resume.pdf"
}
```

`resume_file` is optional. When it is omitted, the API uses `backend/my_resume.pdf` or `backend/uploads/my_resume.pdf`.

Response body:

```json
{
  "answer": "The resume describes ...",
  "agent": "technical_skills",
  "agent_name": "Technical Skills Agent",
  "sources": [
    {
      "section": "Skills",
      "excerpt": "Python, ..."
    }
  ]
}
```

The question is required, cannot be blank, and is limited to 2,000 characters. Errors use HTTP status codes and a `detail` message (for example, `404` for a missing resume, `422` for an unreadable or textless PDF, `503` for missing Groq configuration, and `502` for a provider failure).

## Agent routing

| Agent | Typical questions |
| --- | --- |
| Recruiter Agent | Candidate introduction, broad experience, or general fit |
| Technical Skills Agent | Skills, technologies, programming, or technical stack |
| Project Agent | Project walkthroughs, implementation, and architecture |
| Career Agent | Education, certifications, career history, and contact or availability questions |

Routing is based on keyword rules. When no specialist-specific keyword matches, the Recruiter Agent is used. The routed specialist's instructions affect the answer style; every agent still uses the same RAG retrieval and evidence-grounding rules.

## Data handling and deployment notes

- Resume text is embedded and indexed locally by Chroma; it is not sent to Groq for embedding.
- For a chat answer, the retrieved resume excerpts and the recruiter's question are sent to Groq for generation. Do not use this service with a resume unless you have permission to process and share its relevant excerpts with the configured provider.
- Uploaded PDFs and the Chroma database are stored on the backend filesystem under `backend/uploads/`.
- Local Chroma storage and uploaded PDFs are not automatically durable across Render deployments. Configure a persistent disk and an appropriate mount path before relying on uploaded resumes or the index in production. The index can be recreated from an available PDF.
- `render.yaml` deploys the FastAPI backend and expects `GROQ_API_KEY` to be set as a Render secret/environment variable. Never put that key in `VITE_API_URL` or the Vercel frontend environment.
- The frontend can be deployed to Vercel; configure `VITE_API_URL` to the deployed Render backend URL.

## Tests and production build

Backend tests:

```powershell
cd backend
uv run --locked python -B -m unittest discover -s tests
uv lock --check
```

Frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

The frontend production build may print a non-blocking warning when the generated JavaScript bundle exceeds Vite's default size advisory threshold.

## Project structure

```text
backend/
  agents.py                Specialist definitions and supervisor routing
  main.py                  FastAPI API, upload handling, Chroma retrieval, Groq answers
  rag/
    resume_chunks.py       Resume section parsing and overlapping chunk generation
  tests/
    test_rag_agents.py     Agent routing and chunking tests
  uploads/                 Uploaded PDF files and local Chroma persistence
frontend/
  src/App.jsx              Portfolio chat, upload flow, agent and source display
  src/index.css            Tailwind base styles and app background
  src/App.css              Reusable UI component styles
render.yaml                Render backend deployment configuration
```
