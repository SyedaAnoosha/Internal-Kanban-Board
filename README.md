# Kanban-Board

This project requires certain environment variables to be configured to run correctly. 

## Environment Variables

### Backend (`backend/.env`)
Please add the following variables to your `backend/.env` file:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SECRET_KEY`: Your Supabase secret API key.
- `DATABASE_URL`: The PostgreSQL connection string for your database.
- `SUPABASE_SERVICE_ROLE_KEY`: The Supabase service role key.

### Frontend (`frontend/.env`)
Please add the following variables to your `frontend/.env` file:
- `VITE_API_BASE_URL`: The URL where your backend API is running (e.g., `http://localhost:8000`).

## Documentation

- **Backend**: Python-based API (FastAPI) interacting with Supabase.
- **Frontend**: React frontend using Vite.
