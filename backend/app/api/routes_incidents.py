from fastapi import APIRouter
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.chaos_engine import chaos_engine

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("")
def list_incidents():
    # Active incident report from RCA engine
    rca = ai_rca_engine.analyze_incident()
    active_list = []
    if rca["status"] != "HEALTHY":
        active_list.append({
            "id": rca["incident_id"],
            "title": rca["title"],
            "severity": rca["severity"],
            "status": "INVESTIGATING",
            "confidence": rca["confidence_score"],
            "detected_issue": rca["detected_issue"],
            "probable_root_cause": rca["probable_root_cause"],
            "evidence_chain": rca["evidence_chain"],
            "impact": rca["impact"],
            "recommended_actions": rca["recommended_actions"],
            "ai_explanation": rca["ai_explanation"],
            "timestamp": rca["timestamp"]
        })

    # Historical sample incidents for demo completeness
    resolved_list = [
        {
            "id": "INC-RESOLVED-104",
            "title": "Redis Maxmemory Eviction Spike",
            "severity": "MEDIUM",
            "status": "RESOLVED",
            "confidence": 91,
            "detected_issue": "Volatile key evictions increased by 400% on redis cache.",
            "probable_root_cause": "Session TTL not expiring correctly due to timezone offset.",
            "timestamp": "2026-08-09 18:22:10",
            "resolution": "Applied TTL fix and increased Redis memory limit to 512MB."
        },
        {
            "id": "INC-RESOLVED-103",
            "title": "Nginx Ingress 502 Bad Gateway",
            "severity": "HIGH",
            "status": "RESOLVED",
            "confidence": 88,
            "detected_issue": "Upstream service timeout on /checkout route.",
            "probable_root_cause": "Database connection pool reached saturation limit.",
            "timestamp": "2026-08-08 11:45:00",
            "resolution": "Scaled database read replica pool and enabled pgbouncer."
        }
    ]

    return {
        "active_count": len(active_list),
        "active_incidents": active_list,
        "resolved_incidents": resolved_list
    }
