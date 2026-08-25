# portfolio

Ali Mroue's portfolio site, the content API behind it, and the CMS that edits it.

## Structure
- `backend/`  — FastAPI + MySQL: the content API, CRUD for the CMS, and sign-in
- `frontend/` — the site at `/`, the CMS at `/admin`, edit mode on the page itself
- `mobile/`   — Expo app

## Getting started

```bash
# backend
cd backend
venv/Scripts/activate            # source venv/bin/activate elsewhere
pip install -r requirements.txt
alembic upgrade head             # schema
python -m app.seed               # content + the first administrator (prints its password)
uvicorn main:app --reload

# frontend, in another terminal
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 for the site and http://localhost:5173/admin to
sign in and edit it. DB settings and secrets live in `backend/.env`, which is
never committed — `backend/.env.example` documents every key.
