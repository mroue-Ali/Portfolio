"""
The ask bar's brain.

`ask.py` still holds the written answers and their keyword matcher — that stays
the floor. This package is the ceiling: a two-step retrieval loop that shows a
model what tables exist, lets it choose the relevant ones, then answers from the
rows it picked.

    llm.py       one function, four providers, all with a free tier
    catalog.py   the tables, described for a model rather than for SQL
    prompts.py   the two prompts, kept out of the code that sends them
    pipeline.py  route -> load -> answer, falling back to keywords on any failure
"""

from .pipeline import answer_question, stream_answer

__all__ = ["answer_question", "stream_answer"]
