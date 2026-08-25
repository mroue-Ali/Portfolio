"""Entry point: `uvicorn main:app --reload` from backend/.

The application itself lives in app/main.py; this keeps the run command short.
"""

from app.main import app

__all__ = ["app"]
