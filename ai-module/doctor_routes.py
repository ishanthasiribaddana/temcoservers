"""
FastAPI routes for AI Doctor — server troubleshooting assistant.
All endpoints are under /ai/doctor/
"""

import logging
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_session, AiDoctorSession, AiDoctorMessage, AiDoctorQuota
from doctor_agent import run_doctor_turn, execute_confirmed_fix
from ssh_executor import test_connection

logger = logging.getLogger("ai_doctor.routes")

router = APIRouter(prefix="/ai/doctor", tags=["AI Doctor"])


# ─── Request/Response Models ─────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    gup_id: int
    instance_id: int
    server_ip: str
    server_user: str = "root"
    server_password: str
    display_name: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str
    gup_id: int
    server_ip: str
    server_user: str = "root"
    server_password: str


class ConfirmFixRequest(BaseModel):
    command: str
    gup_id: int
    server_ip: str
    server_user: str = "root"
    server_password: str


class QuotaResponse(BaseModel):
    gup_id: int
    date: str
    requests_used: int
    daily_limit: int
    remaining: int


class SessionResponse(BaseModel):
    session_id: int
    instance_id: int
    status: str
    title: Optional[str]
    created_at: str
    closed_at: Optional[str]


class MessageResponse(BaseModel):
    message_id: int
    role: str
    content: str
    command_executed: Optional[str]
    command_output: Optional[str]
    created_at: str


# ─── Quota Helpers ────────────────────────────────────────────────────────────

def _check_and_increment_quota(gup_id: int) -> QuotaResponse:
    """Check quota and increment if within limit. Raises HTTPException if exceeded."""
    db = get_session()
    try:
        today = date.today().isoformat()
        quota = db.query(AiDoctorQuota).filter(
            AiDoctorQuota.gup_id == gup_id,
            AiDoctorQuota.quota_date == today
        ).first()

        if not quota:
            quota = AiDoctorQuota(
                gup_id=gup_id,
                quota_date=today,
                requests_used=0,
                daily_limit=50
            )
            db.add(quota)
            db.flush()

        if quota.requests_used >= quota.daily_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily AI Doctor quota exceeded ({quota.daily_limit} requests). Resets at midnight UTC."
            )

        quota.requests_used += 1
        db.commit()

        return QuotaResponse(
            gup_id=gup_id,
            date=today,
            requests_used=quota.requests_used,
            daily_limit=quota.daily_limit,
            remaining=quota.daily_limit - quota.requests_used
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Quota check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to check quota")
    finally:
        db.close()


def _get_quota(gup_id: int) -> QuotaResponse:
    """Get current quota without incrementing."""
    db = get_session()
    try:
        today = date.today().isoformat()
        quota = db.query(AiDoctorQuota).filter(
            AiDoctorQuota.gup_id == gup_id,
            AiDoctorQuota.quota_date == today
        ).first()

        used = quota.requests_used if quota else 0
        limit = quota.daily_limit if quota else 50
        return QuotaResponse(
            gup_id=gup_id, date=today,
            requests_used=used, daily_limit=limit, remaining=limit - used
        )
    finally:
        db.close()


# ─── Session Endpoints ───────────────────────────────────────────────────────

@router.post("/sessions", status_code=201)
async def create_session(req: CreateSessionRequest):
    """Start a new AI Doctor troubleshooting session."""
    # Test SSH connectivity first
    ok, msg = test_connection(req.server_ip, req.server_user, req.server_password)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Cannot connect to server: {msg}")

    db = get_session()
    try:
        session = AiDoctorSession(
            gup_id=req.gup_id,
            instance_id=req.instance_id,
            status="open",
            title=req.display_name or f"Session for {req.server_ip}",
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # Add initial system message with server context
        sys_msg = AiDoctorMessage(
            session_id=session.session_id,
            role="system",
            content=f"Server: {req.display_name or req.server_ip} | IP: {req.server_ip} | User: {req.server_user}",
            created_at=datetime.utcnow()
        )
        db.add(sys_msg)
        db.commit()

        return {
            "session_id": session.session_id,
            "status": session.status,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "server_connected": True
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Create session failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")
    finally:
        db.close()


@router.get("/sessions")
async def list_sessions(gup_id: int, status: Optional[str] = None):
    """List AI Doctor sessions for a customer."""
    db = get_session()
    try:
        query = db.query(AiDoctorSession).filter(AiDoctorSession.gup_id == gup_id)
        if status:
            query = query.filter(AiDoctorSession.status == status)
        sessions = query.order_by(AiDoctorSession.created_at.desc()).limit(50).all()

        return [
            {
                "session_id": s.session_id,
                "instance_id": s.instance_id,
                "status": s.status,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            }
            for s in sessions
        ]
    finally:
        db.close()


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: int, gup_id: int):
    """Get a session with full message history."""
    db = get_session()
    try:
        session = db.query(AiDoctorSession).filter(
            AiDoctorSession.session_id == session_id,
            AiDoctorSession.gup_id == gup_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = db.query(AiDoctorMessage).filter(
            AiDoctorMessage.session_id == session_id
        ).order_by(AiDoctorMessage.created_at).all()

        return {
            "session_id": session.session_id,
            "instance_id": session.instance_id,
            "status": session.status,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "closed_at": session.closed_at.isoformat() if session.closed_at else None,
            "messages": [
                {
                    "message_id": m.message_id,
                    "role": m.role,
                    "content": m.content,
                    "command_executed": m.command_executed,
                    "command_output": m.command_output,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
                if m.role != "system"  # Don't expose system messages to frontend
            ]
        }
    finally:
        db.close()


@router.post("/sessions/{session_id}/message")
async def send_message(session_id: int, req: SendMessageRequest):
    """Send a message in an AI Doctor session and get AI response."""
    # Check quota
    quota = _check_and_increment_quota(req.gup_id)

    db = get_session()
    try:
        # Verify session exists and belongs to this user
        session = db.query(AiDoctorSession).filter(
            AiDoctorSession.session_id == session_id,
            AiDoctorSession.gup_id == req.gup_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.status != "open":
            raise HTTPException(status_code=400, detail="Session is closed")

        # Save user message
        user_msg = AiDoctorMessage(
            session_id=session_id,
            role="user",
            content=req.message,
            created_at=datetime.utcnow()
        )
        db.add(user_msg)
        db.commit()

        # Load conversation history for context
        all_messages = db.query(AiDoctorMessage).filter(
            AiDoctorMessage.session_id == session_id
        ).order_by(AiDoctorMessage.created_at).all()

        # Build message list for AI (include command outputs as context)
        ai_messages = []
        for m in all_messages:
            if m.role == "command":
                # Embed command results as assistant context
                ai_messages.append({
                    "role": "assistant",
                    "content": f"I ran `{m.command_executed}` and got:\n```\n{m.command_output}\n```"
                })
            else:
                ai_messages.append({"role": m.role, "content": m.content})

        # Run AI Doctor turn
        result = await run_doctor_turn(
            messages=ai_messages,
            server_ip=req.server_ip,
            server_user=req.server_user,
            server_password=req.server_password
        )

        # Save command executions
        for cmd in result["commands_run"]:
            cmd_msg = AiDoctorMessage(
                session_id=session_id,
                role="command",
                content=f"Executed: {cmd['command']}",
                command_executed=cmd["command"],
                command_output=cmd["output"][:65000] if cmd["output"] else None,
                tokens_used=0,
                created_at=datetime.utcnow()
            )
            db.add(cmd_msg)

        # Save assistant response
        assistant_msg = AiDoctorMessage(
            session_id=session_id,
            role="assistant",
            content=result["response"],
            tokens_used=result["tokens_used"],
            created_at=datetime.utcnow()
        )
        db.add(assistant_msg)

        # Auto-title the session from first user message if untitled
        if session.title and session.title.startswith("Session for"):
            session.title = req.message[:100]

        db.commit()

        return {
            "response": result["response"],
            "commands_run": result["commands_run"],
            "tokens_used": result["tokens_used"],
            "model_used": result["model_used"],
            "needs_confirmation": result["needs_confirmation"],
            "quota": {
                "requests_used": quota.requests_used,
                "daily_limit": quota.daily_limit,
                "remaining": quota.remaining
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Send message failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Doctor error: {str(e)}")
    finally:
        db.close()


@router.post("/sessions/{session_id}/confirm-fix")
async def confirm_fix(session_id: int, req: ConfirmFixRequest):
    """Execute a previously proposed fix command after customer confirmation."""
    quota = _check_and_increment_quota(req.gup_id)

    db = get_session()
    try:
        session = db.query(AiDoctorSession).filter(
            AiDoctorSession.session_id == session_id,
            AiDoctorSession.gup_id == req.gup_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Load conversation history
        all_messages = db.query(AiDoctorMessage).filter(
            AiDoctorMessage.session_id == session_id
        ).order_by(AiDoctorMessage.created_at).all()

        ai_messages = []
        for m in all_messages:
            if m.role == "command":
                ai_messages.append({
                    "role": "assistant",
                    "content": f"I ran `{m.command_executed}` and got:\n```\n{m.command_output}\n```"
                })
            else:
                ai_messages.append({"role": m.role, "content": m.content})

        result = await execute_confirmed_fix(
            messages=ai_messages,
            command=req.command,
            server_ip=req.server_ip,
            server_user=req.server_user,
            server_password=req.server_password
        )

        # Save command + response
        for cmd in result["commands_run"]:
            cmd_msg = AiDoctorMessage(
                session_id=session_id,
                role="command",
                content=f"Fix executed (confirmed): {cmd['command']}",
                command_executed=cmd["command"],
                command_output=cmd["output"][:65000] if cmd["output"] else None,
                created_at=datetime.utcnow()
            )
            db.add(cmd_msg)

        assistant_msg = AiDoctorMessage(
            session_id=session_id,
            role="assistant",
            content=result["response"],
            tokens_used=result["tokens_used"],
            created_at=datetime.utcnow()
        )
        db.add(assistant_msg)
        db.commit()

        return {
            "response": result["response"],
            "commands_run": result["commands_run"],
            "tokens_used": result["tokens_used"],
            "quota": {
                "requests_used": quota.requests_used,
                "daily_limit": quota.daily_limit,
                "remaining": quota.remaining
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Confirm fix failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fix execution error: {str(e)}")
    finally:
        db.close()


@router.post("/sessions/{session_id}/close")
async def close_session(session_id: int, gup_id: int, status: str = "resolved"):
    """Close an AI Doctor session."""
    if status not in ("resolved", "escalated", "closed"):
        raise HTTPException(status_code=400, detail="Status must be: resolved, escalated, or closed")

    db = get_session()
    try:
        session = db.query(AiDoctorSession).filter(
            AiDoctorSession.session_id == session_id,
            AiDoctorSession.gup_id == gup_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.status = status
        session.closed_at = datetime.utcnow()
        db.commit()

        return {"session_id": session_id, "status": status, "closed_at": session.closed_at.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to close session")
    finally:
        db.close()


@router.get("/quota")
async def get_quota(gup_id: int):
    """Get current daily quota for a customer."""
    return _get_quota(gup_id)


# ─── Admin Endpoints ─────────────────────────────────────────────────────────

@router.get("/admin/sessions")
async def admin_list_sessions(limit: int = 50, status: Optional[str] = None):
    """Admin: list all AI Doctor sessions across all customers."""
    db = get_session()
    try:
        query = db.query(AiDoctorSession)
        if status:
            query = query.filter(AiDoctorSession.status == status)
        sessions = query.order_by(AiDoctorSession.created_at.desc()).limit(limit).all()

        return [
            {
                "session_id": s.session_id,
                "gup_id": s.gup_id,
                "instance_id": s.instance_id,
                "status": s.status,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            }
            for s in sessions
        ]
    finally:
        db.close()


@router.delete("/admin/sessions/stale")
async def admin_cleanup_stale():
    """Admin: delete sessions that have no user messages (only system context)."""
    db = get_session()
    try:
        from sqlalchemy import func
        # Find sessions with zero user messages
        stale_ids = [
            s.session_id for s in db.query(AiDoctorSession).all()
            if db.query(func.count(AiDoctorMessage.message_id)).filter(
                AiDoctorMessage.session_id == s.session_id,
                AiDoctorMessage.role == "user"
            ).scalar() == 0
        ]
        if stale_ids:
            db.query(AiDoctorMessage).filter(AiDoctorMessage.session_id.in_(stale_ids)).delete(synchronize_session=False)
            db.query(AiDoctorSession).filter(AiDoctorSession.session_id.in_(stale_ids)).delete(synchronize_session=False)
            db.commit()
        return {"deleted": len(stale_ids), "session_ids": stale_ids}
    except Exception as e:
        db.rollback()
        logger.error(f"Stale cleanup failed: {e}")
        raise HTTPException(status_code=500, detail="Cleanup failed")
    finally:
        db.close()


@router.delete("/admin/sessions/{session_id}")
async def admin_delete_session(session_id: int):
    """Admin: delete a session and all its messages."""
    db = get_session()
    try:
        session = db.query(AiDoctorSession).filter(AiDoctorSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        db.query(AiDoctorMessage).filter(AiDoctorMessage.session_id == session_id).delete()
        db.delete(session)
        db.commit()
        return {"deleted": True, "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete session failed: {e}")
        raise HTTPException(status_code=500, detail="Delete failed")
    finally:
        db.close()


@router.get("/admin/sessions/{session_id}")
async def admin_get_session(session_id: int):
    """Admin: get full session detail including all messages and commands."""
    db = get_session()
    try:
        session = db.query(AiDoctorSession).filter(
            AiDoctorSession.session_id == session_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = db.query(AiDoctorMessage).filter(
            AiDoctorMessage.session_id == session_id
        ).order_by(AiDoctorMessage.created_at).all()

        return {
            "session_id": session.session_id,
            "gup_id": session.gup_id,
            "instance_id": session.instance_id,
            "status": session.status,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "closed_at": session.closed_at.isoformat() if session.closed_at else None,
            "messages": [
                {
                    "message_id": m.message_id,
                    "role": m.role,
                    "content": m.content,
                    "command_executed": m.command_executed,
                    "command_output": m.command_output,
                    "tokens_used": m.tokens_used,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ]
        }
    finally:
        db.close()
