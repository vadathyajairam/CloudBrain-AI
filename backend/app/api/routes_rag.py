"""
routes_rag.py  —  Synexis RAG Knowledge Base Endpoints
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.app.core.rag_engine import rag_engine

router = APIRouter(prefix="/rag", tags=["RAG Knowledge"])


class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    min_score: Optional[float] = 0.05


@router.get("/stats")
def get_rag_stats() -> dict[str, Any]:
    """Return summary statistics of the Synexis RAG Knowledge Base."""
    return rag_engine.get_stats()


@router.get("/documents")
def list_documents() -> list[dict[str, Any]]:
    """List all indexed runbooks, architectural guides, and incident lessons."""
    return rag_engine.list_documents()


@router.post("/search")
def search_knowledge(request: RAGSearchRequest) -> dict[str, Any]:
    """Retrieve relevant runbooks and past incident resolutions for a technical query."""
    results = rag_engine.retrieve(
        query=request.query,
        top_k=request.top_k or 4,
        min_score=request.min_score or 0.05,
    )
    return {
        "query": request.query,
        "results_count": len(results),
        "results": results,
    }
