from supabase_client import get_supabase

def log_card_event(
    card_id: str, 
    event_type: str, 
    actor_id: str, 
    from_column_id: str = None, 
    to_column_id: str = None, 
    metadata: dict = None
):
    supabase = get_supabase()
    payload = {
        "card_id": card_id,
        "event_type": event_type,
        "actor_id": actor_id,
    }
    if from_column_id: payload["from_column_id"] = from_column_id
    if to_column_id: payload["to_column_id"] = to_column_id
    if metadata: payload["metadata"] = metadata
    
    supabase.table("card_events").insert(payload).execute()

def log_project_event(
    project_id: str,
    event_type: str,
    actor_id: str,
    metadata: dict = None
):
    supabase = get_supabase()
    payload = {
        "project_id": project_id,
        "event_type": event_type,
        "actor_id": actor_id,
    }
    if metadata: payload["metadata"] = metadata
    supabase.table("project_events").insert(payload).execute()

def create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str = None,
    project_id: str = None,
    card_id: str = None,
):
    """Insert a notification row. Never raises — a failed notification
    should not break the action that triggered it."""
    if not user_id:
        return
    supabase = get_supabase()
    payload = {
        "user_id": user_id,
        "type": notif_type,
        "title": title,
    }
    if message: payload["message"] = message
    if project_id: payload["project_id"] = project_id
    if card_id: payload["card_id"] = card_id
    try:
        supabase.table("notifications").insert(payload).execute()
    except Exception as e:
        # Best-effort: log and move on. Verify your logging setup —
        # this currently just prints, which you'll want to replace
        # with real logging in production.
        print(f"Failed to create notification: {e}")