from fastapi import APIRouter, HTTPException
from backend.app.core.container_engine import container_engine

router = APIRouter(prefix="/containers", tags=["Containers"])

@router.get("")
def list_containers():
    return {
        "sandbox_mode": container_engine.is_sandbox_mode,
        "docker_available": container_engine.docker_available,
        "containers": container_engine.list_containers()
    }

@router.get("/{container_id}")
def get_container(container_id: str):
    c = container_engine.get_container(container_id)
    if not c:
        raise HTTPException(status_code=404, detail="Container not found")
    return c

@router.post("/{container_id}/restart")
def restart_container(container_id: str):
    try:
        return container_engine.restart_container(container_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{container_id}/stop")
def stop_container(container_id: str):
    try:
        return container_engine.stop_container(container_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{container_id}/start")
def start_container(container_id: str):
    try:
        return container_engine.start_container(container_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
