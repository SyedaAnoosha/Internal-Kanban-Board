"""
Shared access-control helpers for project membership.

The Supabase client used elsewhere in this app is created with the
SERVICE ROLE key (see supabase_client.py), which bypasses Row Level
Security entirely. That means every permission check MUST happen here,
in application code — there is no DB-level safety net.
"""
from fastapi import HTTPException, status
from supabase_client import get_supabase

def get_membership(project_id: str, user_id: str) -> dict | None:
    """Return the project_members row for (project_id, user_id), or None."""
    supabase = get_supabase()
    res = (
        supabase.table("project_members")
        .select("*")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


def require_project_access(project_id: str, user_id: str) -> dict:
    """Raise 403/404 unless the user is an ACCEPTED member (owner or member)."""
    membership = get_membership(project_id, user_id)
    if not membership or membership["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )
    return membership


def require_project_owner(project_id: str, user_id: str) -> dict:
    """Raise 403 unless the user is the ACCEPTED owner of the project."""
    membership = require_project_access(project_id, user_id)
    if membership["role"] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can perform this action",
        )
    return membership


def get_accepted_project_ids(user_id: str) -> list[str]:
    """All project IDs the user is an accepted member of."""
    supabase = get_supabase()
    res = (
        supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user_id)
        .eq("status", "accepted")
        .execute()
    )
    return [row["project_id"] for row in res.data]
