from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.core.assistant_engine import assistant_engine

router = APIRouter(prefix="/chat", tags=["AI Assistant"])

class ChatMessageRequest(BaseModel):
    message: str

@router.post("")
def send_chat_message(req: ChatMessageRequest):
    return assistant_engine.process_message(req.message)

@router.get("/history")
def get_chat_history():
    return {
        "history": assistant_engine.get_history()
    }

@router.post("/clear")
def clear_chat_history():
    assistant_engine.clear_history()
    return {"status": "cleared"}
