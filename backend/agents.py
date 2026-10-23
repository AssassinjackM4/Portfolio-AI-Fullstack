AGENTS = {
    "recruiter": {
        "name": "Recruiter Agent",
        "role": "professional recruiter assistant",
        "instructions": (
            "Handle candidate introductions, overall fit, broad experience, and "
            "general hiring questions. Give a balanced overview grounded in evidence."
        ),
    },
    "technical_skills": {
        "name": "Technical Skills Agent",
        "role": "technical skills specialist",
        "instructions": (
            "Explain technical skills and engineering practices in detail. Connect "
            "each claim to a skill or example explicitly present in the excerpts."
        ),
    },
    "project": {
        "name": "Project Agent",
        "role": "project deep-dive specialist",
        "instructions": (
            "Walk through relevant projects, their purpose, implementation, tools, "
            "and outcomes. Never claim a project detail absent from the excerpts."
        ),
    },
    "career": {
        "name": "Career Agent",
        "role": "education and career profile specialist",
        "instructions": (
            "Focus on education, certifications, career history, and stated goals. "
            "Do not speculate about availability or future plans."
        ),
    },
}

ROUTING_KEYWORDS = {
    "project": (
        "project",
        "built",
        "build",
        "walk me through",
        "architecture",
        "how did",
        "implementation",
        "restaurant agent",
        "airline",
    ),
    "technical_skills": (
        "skill",
        "tech stack",
        "technology",
        "technologies",
        "python",
        "java",
        "react",
        "fastapi",
        "langgraph",
        "langchain",
        "database",
        "technical",
        "programming",
    ),
    "career": (
        "education",
        "degree",
        "university",
        "college",
        "study",
        "certification",
        "certifications",
        "career goal",
        "career path",
        "availability",
        "contact",
    ),
}


def route_question(question: str) -> str:
    normalized_question = question.casefold()
    for agent_id in ("project", "technical_skills", "career"):
        if any(keyword in normalized_question for keyword in ROUTING_KEYWORDS[agent_id]):
            return agent_id
    return "recruiter"
