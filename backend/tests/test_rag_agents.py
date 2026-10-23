import unittest

from agents import route_question
from rag.resume_chunks import CHUNK_OVERLAP_WORDS, MAX_CHUNK_WORDS, chunk_resume


class AgentRoutingTests(unittest.TestCase):
    def test_routes_questions_to_specialists(self):
        self.assertEqual(route_question("Walk me through the restaurant agent project"), "project")
        self.assertEqual(route_question("What Python skills does the candidate have?"), "technical_skills")
        self.assertEqual(route_question("Where did the candidate study?"), "career")
        self.assertEqual(route_question("Tell me about the candidate"), "recruiter")


class ResumeChunkingTests(unittest.TestCase):
    def test_preserves_section_labels(self):
        chunks = chunk_resume("TECHNICAL SKILLS\nPython and React\n\nPROJECTS\nBuilt an AI assistant")

        self.assertEqual([chunk["section"] for chunk in chunks], ["Technical Skills", "Projects"])

    def test_splits_long_sections_with_context_overlap(self):
        words = [f"word{index}" for index in range(MAX_CHUNK_WORDS * 2)]
        chunks = chunk_resume(f"EXPERIENCE\n{' '.join(words)}")

        self.assertGreaterEqual(len(chunks), 2)
        first_words = chunks[0]["content"].split()
        second_words = chunks[1]["content"].split()
        self.assertEqual(len(first_words), MAX_CHUNK_WORDS)
        self.assertEqual(
            first_words[-CHUNK_OVERLAP_WORDS:],
            second_words[:CHUNK_OVERLAP_WORDS],
        )


if __name__ == "__main__":
    unittest.main()
