# ERM Internal Kanban Board

A modern, full-stack Kanban Board built for Effective Risk Management (ERM). This application allows teams to organize projects, manage tasks, assign team members, and track real-time progress through custom workflows.

## 🚀 Features

- **Project Management**: Create multiple projects and invite team members.
- **Kanban Workflows**: Organize work with standard columns (e.g., In Progress, Under Review, Done).
- **Task Management**: Create, assign, and track cards. Move cards seamlessly between columns.
- **Team Collaboration**: Built-in workflows for requesting reviews and approving tasks.
- **Activity Tracking**: Detailed event history and audit logs for every card.
- **Notifications**: Real-time alerts for assignments, invitations, and review requests.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS (or standard CSS modules)
- **Backend**: Python, FastAPI
- **Database & Auth**: Supabase (PostgreSQL, Authentication)

## ⚙️ Environment Variables

To run this project locally, you must configure the following environment variables.

### Backend (`backend/.env`)
Create a `.env` file in the `backend` directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# Optional: Add any additional secrets your backend may require
```
*(Note: `SUPABASE_SERVICE_ROLE_KEY` is required for elevated administrative tasks in the backend.)*

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 💻 Local Development Setup

### 1. Backend Setup
Navigate to the backend directory and set up a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Run the FastAPI development server:
```bash
fastapi dev main.py
# or
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```
Start the Vite development server:
```bash
npm run dev
```

## 📖 Application Structure

- `/backend`: Contains the FastAPI application, divided into modular routes (`projects.py`, `cards.py`, `users.py`, etc.).
- `/frontend`: Contains the React application and context providers for state management.
