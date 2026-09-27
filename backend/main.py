import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import routers
from auth import router as auth_router
from routes.auth_refresh import router as auth_refresh_router
from routes.columns import router as columns_router
from routes.cards import router as cards_router
from routes.users import router as users_router
from routes.history import router as history_router
from routes.projects import router as projects_router
from routes.notifications import router as notifications_router

load_dotenv()

app = FastAPI(title="ERM Kanban API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(auth_refresh_router)
app.include_router(columns_router)
app.include_router(cards_router)
app.include_router(users_router)
app.include_router(history_router)
app.include_router(projects_router)
app.include_router(notifications_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend"}
