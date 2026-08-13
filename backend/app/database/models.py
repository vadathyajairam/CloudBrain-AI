"""
database/models.py
SQLAlchemy ORM models for Synexis — Intelligent System Analysis and Automation Platform.

Tables:
  environments        — tracked data sources (local, docker, postgresql, rag, ai_provider, aws, k8s…)
  system_metrics      — persisted host-level metric snapshots
  container_metrics   — per-container CPU/memory time-series
  log_entries         — persisted log lines from Docker containers
  incidents           — detected operational problems (full lifecycle)
  incident_evidence   — evidence items collected per incident
  ai_analyses         — LLM RCA results per incident (including RAG sources)
  remediation_actions — approved / executed fix actions
  audit_logs          — full action audit trail
  rag_documents       — knowledge base runbooks & indexed incident resolutions
  rag_chunks          — chunked text embeddings and retrieval index
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Environments (Data Sources) ───────────────────────────────────────────────

class Environment(Base):
    """A monitored data source / infrastructure environment."""
    __tablename__ = "environments"

    id = Column(String(64), primary_key=True)           # "local", "docker", "postgresql", "ai_provider", "rag", "kubernetes", "aws"
    name = Column(String(128), nullable=False)
    env_type = Column(String(32), nullable=False)        # local | docker | database | ai | rag | kubernetes | aws | azure | gcp
    connected = Column(Boolean, default=False)
    status_detail = Column(String(256), default="")
    connected_at = Column(DateTime, default=_utcnow)
    last_checked = Column(DateTime, default=_utcnow)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "env_type": self.env_type,
            "connected": self.connected,
            "status_detail": self.status_detail,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "last_checked": self.last_checked.isoformat() if self.last_checked else None,
        }


# ── Metrics ───────────────────────────────────────────────────────────────────

class SystemMetric(Base):
    """One host-level telemetry snapshot (every 2-3s)."""
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=_utcnow, index=True)
    cpu_percent = Column(Float, default=0.0)
    memory_percent = Column(Float, default=0.0)
    memory_used_gb = Column(Float, default=0.0)
    memory_total_gb = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)
    disk_used_gb = Column(Float, default=0.0)
    network_upload_kbps = Column(Float, default=0.0)
    network_download_kbps = Column(Float, default=0.0)
    health_score = Column(Integer, default=100)
    status = Column(String(16), default="HEALTHY")


class ContainerMetric(Base):
    """Per-container CPU/memory snapshot."""
    __tablename__ = "container_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=_utcnow, index=True)
    container_id = Column(String(64), index=True)
    container_name = Column(String(128))
    cpu_percent = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    memory_limit_mb = Column(Float, default=0.0)
    status = Column(String(32), default="running")
    state = Column(String(32), default="healthy")
    restart_count = Column(Integer, default=0)


# ── Logs ──────────────────────────────────────────────────────────────────────

class LogEntry(Base):
    """Persisted log line from a Docker container or system source."""
    __tablename__ = "log_entries"

    id = Column(String(36), primary_key=True)           # uuid
    timestamp = Column(DateTime, default=_utcnow, index=True)
    level = Column(String(16), default="INFO", index=True)  # DEBUG|INFO|WARN|ERROR|CRITICAL
    service = Column(String(128), index=True)
    container_id = Column(String(64))
    message = Column(Text)
    source = Column(String(64), default="docker_logs")   # docker_logs | system | chaos_injection

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "level": self.level,
            "service": self.service,
            "container_id": self.container_id,
            "message": self.message,
            "source": self.source,
        }


# ── Incidents ─────────────────────────────────────────────────────────────────

class Incident(Base):
    """
    An operational problem detected by the Synexis rule engine.

    Lifecycle: DETECTED → ACKNOWLEDGED → INVESTIGATING → REMEDIATING → RESOLVED → CLOSED
    """
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True)          # e.g. INC-1723380000
    title = Column(String(256), nullable=False)
    description = Column(Text, default="")
    severity = Column(String(16), default="MEDIUM")    # LOW | MEDIUM | HIGH | CRITICAL
    status = Column(String(32), default="DETECTED")    # see lifecycle above
    service = Column(String(128), default="")          # container name / service name
    container_id = Column(String(128))                 # Docker short id
    rule_id = Column(String(64))                       # which detection rule triggered this
    detected_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
    resolved_at = Column(DateTime)
    closed_at = Column(DateTime)
    auto_resolved = Column(Boolean, default=False)
    resolution_summary = Column(Text, default="")

    # Relationships
    evidence = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    analyses = relationship("AIAnalysis", back_populates="incident", cascade="all, delete-orphan")
    remediations = relationship("RemediationAction", back_populates="incident")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "status": self.status,
            "service": self.service,
            "container_id": self.container_id,
            "rule_id": self.rule_id,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "auto_resolved": self.auto_resolved,
            "resolution_summary": self.resolution_summary or "",
            "evidence": [e.to_dict() for e in (self.evidence or [])],
            "latest_analysis": self.analyses[-1].to_dict() if self.analyses else None,
        }


class IncidentEvidence(Base):
    """Evidence item collected for a specific incident."""
    __tablename__ = "incident_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), nullable=False)
    evidence_type = Column(String(32))                 # METRIC | CONTAINER | LOG_TRACE | HEALTH
    source = Column(String(128))
    detail = Column(Text)
    collected_at = Column(DateTime, default=_utcnow)

    incident = relationship("Incident", back_populates="evidence")

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.evidence_type,
            "source": self.source,
            "detail": self.detail,
            "collected_at": self.collected_at.isoformat() if self.collected_at else None,
        }


# ── AI Analysis & RAG ─────────────────────────────────────────────────────────

class AIAnalysis(Base):
    """LLM-generated RCA result for an incident grounded in live telemetry & RAG knowledge."""
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), nullable=False)
    model_used = Column(String(64), default="rules-only")
    root_cause = Column(Text)
    confidence = Column(Integer)                       # 0-100, NULL = insufficient evidence
    alternative_causes = Column(JSON, default=list)
    recommendation = Column(Text)
    structured_actions = Column(JSON, default=list)    # list of StructuredAction dicts
    rag_sources = Column(JSON, default=list)           # list of retrieved RAG document chunks
    raw_response = Column(Text)                        # raw LLM output for debugging
    created_at = Column(DateTime, default=_utcnow)

    incident = relationship("Incident", back_populates="analyses")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "model_used": self.model_used,
            "root_cause": self.root_cause,
            "confidence": self.confidence,
            "alternative_causes": self.alternative_causes or [],
            "recommendation": self.recommendation,
            "structured_actions": self.structured_actions or [],
            "rag_sources": self.rag_sources or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ── Remediation ───────────────────────────────────────────────────────────────

class RemediationAction(Base):
    """
    A remediation action proposed and / or executed by Synexis.

    Status: PENDING → APPROVED → EXECUTING → SUCCESS | FAILED
    """
    __tablename__ = "remediation_actions"

    id = Column(String(64), primary_key=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"))
    action_type = Column(String(64), nullable=False)   # restart_container | start_container | stop_container
    target = Column(String(128), nullable=False)       # container name (must match allowlist)
    reason = Column(Text)
    status = Column(String(32), default="PENDING")     # PENDING | APPROVED | EXECUTING | SUCCESS | FAILED
    proposed_by = Column(String(64), default="ai_rca_engine")
    approved_by = Column(String(64))
    approved_at = Column(DateTime)
    executed_at = Column(DateTime)
    result = Column(JSON)                              # raw execution outcome
    verification = Column(JSON)                        # post-action health check results
    created_at = Column(DateTime, default=_utcnow)

    incident = relationship("Incident", back_populates="remediations")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "action_type": self.action_type,
            "target": self.target,
            "reason": self.reason,
            "status": self.status,
            "proposed_by": self.proposed_by,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "result": self.result,
            "verification": self.verification,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ── Audit Logs ────────────────────────────────────────────────────────────────

class AuditLog(Base):
    """Every significant operator/system action is recorded here for compliance & transparency."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(128), nullable=False)       # e.g. "remediation.approve", "remediation.execute", "incident.resolve"
    target = Column(String(128))                       # e.g. "synexis-postgres"
    actor = Column(String(64), default="system")       # user_id or system module
    role = Column(String(32), default="operator")      # admin | sre_operator | system
    reason = Column(Text)
    details = Column(JSON)
    result = Column(String(32))                        # SUCCESS | FAILED | PENDING | REJECTED
    timestamp = Column(DateTime, default=_utcnow, index=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "action": self.action,
            "target": self.target,
            "actor": self.actor,
            "role": self.role,
            "reason": self.reason,
            "details": self.details,
            "result": self.result,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


# ── RAG Knowledge Base ────────────────────────────────────────────────────────

class RAGDocument(Base):
    """A runbook, troubleshooting guide, architectural document, or historical incident lesson."""
    __tablename__ = "rag_documents"

    id = Column(String(64), primary_key=True)          # e.g. "DOC-POSTGRES-CONN", "INC-HIST-172338"
    title = Column(String(256), nullable=False)
    category = Column(String(64), default="Runbook")   # Runbook | Architecture | Troubleshooting | IncidentLesson
    source_type = Column(String(32), default="builtin") # builtin | user_uploaded | incident_resolution
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)                  # ["postgres", "connections", "database"]
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    chunks = relationship("RAGChunk", back_populates="document", cascade="all, delete-orphan")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "source_type": self.source_type,
            "content": self.content,
            "tags": self.tags or [],
            "chunk_count": len(self.chunks) if self.chunks else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class RAGChunk(Base):
    """A semantic chunk of a RAG document with token representation and keyword index."""
    __tablename__ = "rag_chunks"

    id = Column(String(96), primary_key=True)          # e.g. "DOC-POSTGRES-CONN_chunk_0"
    document_id = Column(String(64), ForeignKey("rag_documents.id"), nullable=False)
    chunk_index = Column(Integer, default=0)
    title = Column(String(256), default="")
    content = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)              # extracted search terms
    token_count = Column(Integer, default=0)
    embedding_json = Column(JSON, nullable=True)       # optional dense embedding vector

    document = relationship("RAGDocument", back_populates="chunks")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "title": self.title,
            "content": self.content,
            "keywords": self.keywords or [],
            "token_count": self.token_count,
        }
