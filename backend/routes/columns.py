from fastapi import APIRouter, Depends
from schemas import ColumnOut
from auth import get_current_user
from supabase_client import get_supabase

router = APIRouter(prefix="/columns", tags=["columns"])

@router.get("/", response_model=list[ColumnOut])
def get_columns(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = supabase.table("columns").select("*").order("position").execute()
    return response.data