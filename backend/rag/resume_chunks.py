import re

MAX_CHUNK_WORDS = 180
CHUNK_OVERLAP_WORDS = 30
DEFAULT_SECTION = "Resume"
KNOWN_HEADINGS = {
    "about",
    "summary",
    "professional summary",
    "profile",
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "internships",
    "education",
    "technical skills",
    "skills",
    "projects",
    "certifications",
    "achievements",
    "contact",
}


def _is_heading(line: str) -> bool:
    normalized = re.sub(r"[:\s]+$", "", line).strip()
    folded = normalized.casefold()
    return (
        folded in KNOWN_HEADINGS
        or (len(normalized.split()) <= 8 and normalized.isupper() and len(normalized) > 2)
    )


def _split_large_text(text: str) -> list[str]:
    words = text.split()
    if len(words) <= MAX_CHUNK_WORDS:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + MAX_CHUNK_WORDS, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - CHUNK_OVERLAP_WORDS
    return chunks


def chunk_resume(resume_text: str) -> list[dict[str, str]]:
    chunks = []
    section = DEFAULT_SECTION
    buffered_lines = []

    def flush_buffer():
        content = " ".join(buffered_lines).strip()
        if content:
            chunks.extend(
                {"section": section, "content": part}
                for part in _split_large_text(content)
                if part
            )
        buffered_lines.clear()

    for raw_line in resume_text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            flush_buffer()
        elif _is_heading(line):
            flush_buffer()
            section = re.sub(r"[:\s]+$", "", line).strip().title()
        else:
            buffered_lines.append(line)

    flush_buffer()
    return chunks
