from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from supabase import Client
from supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ── Request/Response Models ──────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


# ── Helper: Validate JWT ─────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate JWT and return user info. Use this as a dependency in protected routes."""
    supabase = get_supabase()
    token = credentials.credentials
    
    try:
        # Validate the token by fetching the user
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
def signup(request: SignupRequest):
    """Create a new user in Supabase Auth."""
    supabase = get_supabase()
    
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {"full_name": request.full_name} if request.full_name else {}
            }
        })
        
        if not response.session:
            # Email confirmation might be required
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup succeeded but no session returned. Check if email confirmation is required.",
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}",
        )


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    """Authenticate user and return session."""
    supabase = get_supabase()
    
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.post("/logout")
def logout():
    return {"status": "ok", "message": "Logged out successfully"}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Return current user info. Requires valid JWT in Authorization header."""
    return current_user