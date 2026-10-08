import json
import os
import shutil
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from pypdf import PdfReader

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

model = "openai/gpt-oss-120b"
app = FastAPI()

# CORS Configuration for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://portfolio-ai-frontend.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    total_experience_years: float | None = None
    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []


resume_schema = Resume.model_json_schema()


class ChatRequest(BaseModel):
    question: str
    resume_file: str | None = None


def resolve_resume_path(resume_file: str | None = None) -> Path:
    candidate_paths = []

    if resume_file:
        clean_name = resume_file.strip().replace("\\", "/")
        candidate_paths.extend([
            BASE_DIR / clean_name,
            UPLOAD_DIR / clean_name,
            BASE_DIR / Path(clean_name).name,
            UPLOAD_DIR / Path(clean_name).name,
        ])

    candidate_paths.extend([
        BASE_DIR / "my_resume.pdf",
        UPLOAD_DIR / "my_resume.pdf",
    ])

    seen = set()
    for path in candidate_paths:
        normalized = path.resolve()
        if normalized in seen:
            continue
        seen.add(normalized)
        if normalized.exists():
            return normalized

    raise FileNotFoundError("No resume file found. Please upload a PDF resume first.")


def ask_candidate(question: str, resume: Resume):
    system_prompt = f"""You are an AI assistant representing a job candidate.

Below is everything you know about the candidate.

{resume.model_dump_json(indent=2)}

Rules:
1. Answer only using this information.
2. Never hallucinate.
3. If information is unavailable, say "I don't have enough information to answer that."
4. Be professional.
5. Answer as if HR is interviewing this candidate.
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
    )

    return response.choices[0].message.content


def parse_resume(resume_text):
    system_prompt = f"""You are an expert resume parser.

Extract information from the resume based on its meaning, not only based on exact section headings.

Different resumes may use different headings like: Experience, Professional Experience, Work History, Employment, Internships.

Skills may also appear in the skills section, work experience, internships or projects.

Return ONLY valid JSON matching this schema: {resume_schema}

Important rules:
1. Do not invent information.
2. If a value is not available, return null.
3. If a list has no information, return an empty list.
4. Include internships inside experiences.
5. Extract skills mentioned across the entire resume.
"""

    user_prompt = f"Parse the following resume:\n\n{resume_text}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"}
    )

    raw_output = response.choices[0].message.content
    data = json.loads(raw_output)
    resume = Resume(**data)
    return resume


def read_pdf(file_path: Path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


@app.get("/")
def home():
    return {
        "message": "Portfolio AI Backend is running! 🚀",
        "status": "healthy",
        "endpoints": {
            "chat": "POST /chat",
            "upload_resume": "POST /upload-resume",
            "health": "GET /"
        }
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resume files are supported.")

    filename = file.filename.replace(" ", "_")
    save_path = UPLOAD_DIR / filename

    with save_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Resume uploaded successfully",
        "filename": save_path.name,
        "path": str(save_path),
        "status": "uploaded",
    }


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        resume_path = resolve_resume_path(request.resume_file)
    except FileNotFoundError:
        return {
            "answer": "Resume file not found. Please upload a PDF resume in the app or place my_resume.pdf in the backend folder."
        }

    resume_text = read_pdf(resume_path)
    resume = parse_resume(resume_text)
    answer = ask_candidate(request.question, resume)

    return {
        "answer": answer
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
