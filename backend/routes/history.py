from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from auth import get_current_user
from supabase_client import get_supabase
from permissions import require_project_access, get_accepted_project_ids

router = APIRouter(prefix="/history", tags=["history"])

def _apply_scope(query, project_id: Optional[UUID], personal: Optional[bool], current_user: dict):
    user_id = str(current_user["id"])

    if project_id:
        require_project_access(str(project_id), user_id)
        return query.eq("project_id", str(project_id))

    if personal:
        return query.eq("owner_id", user_id)

    project_ids = get_accepted_project_ids(user_id)
    if project_ids:
        in_list = ",".join(project_ids)
        return query.or_(f"owner_id.eq.{user_id},project_id.in.({in_list})")
    return query.eq("owner_id", user_id)

@router.get("/months")
def get_history_months(
    project_id: Optional[UUID] = None,
    personal: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    query = supabase.table("cards").select("completed_at").not_.is_("completed_at", "null")
    query = _apply_scope(query, project_id, personal, current_user)

    response = query.execute()
    months = set()
    for row in response.data:
        date_str = row['completed_at']
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            months.add(dt.strftime("%Y-%m"))
        except ValueError:
            continue
    return sorted(list(months), reverse=True)

# ==========================================
# OPTIMIZED: Fetch cards and owner profiles in a SINGLE query
# ==========================================
@router.get("/")
def get_history(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    project_id: Optional[UUID] = None,
    personal: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    
    # Join the owner profile directly in the select statement
    query = supabase.table("cards").select(
        "*, owner:profiles!cards_owner_id_fkey(id, email, full_name)"
    ).not_.is_("completed_at", "null")
    
    query = _apply_scope(query, project_id, personal, current_user)

    if month:
        try:
            year, mon = map(int, month.split('-'))
            start_date = datetime(year, mon, 1)
            if mon == 12:
                end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
            else:
                end_date = datetime(year, mon + 1, 1) - timedelta(seconds=1)
            query = query.gte("completed_at", start_date.isoformat()).lte("completed_at", end_date.isoformat())
        except ValueError:
            pass

    response = query.order("completed_at", desc=True).execute()
    
    # The 'owner' object is already nested inside each card dictionary
    return response.data