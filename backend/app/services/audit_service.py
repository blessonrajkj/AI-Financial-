from sqlalchemy.orm import Session
from typing import Any, Optional
from app.models.audit_log import AuditLog

def log_audit_event(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Any] = None
) -> AuditLog:
    """Record security or compliance event in append-only audit_logs table."""
    audit_entry = AuditLog(
        user_id=user_id,
        action=action.upper(),
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
