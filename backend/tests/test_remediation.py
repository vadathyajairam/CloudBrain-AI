import os
import pytest
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite:///./test_synexis_rem.db"

from backend.app.database import engine
from backend.app.database.models import Base
from backend.app.core.incident_manager import _ACTIVE_KEY_MAP
from backend.app.core.remediation_engine import (
    RemediationEngine,
    SafetyValidationError,
    _validate_action,
    ALLOWED_ACTIONS,
)
from backend.app.core.verification_engine import VerificationResult, VerificationCheck


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _ACTIVE_KEY_MAP.clear()
    yield
    _ACTIVE_KEY_MAP.clear()
    Base.metadata.drop_all(bind=engine)


class TestSafetyValidator:
    def test_valid_action_passes(self):
        # Should not raise
        _validate_action("restart_container", "synexis-demo-app")
        _validate_action("restart_container", "cloudbrain-demo-app")

    def test_invalid_action_type_raises(self):
        with pytest.raises(SafetyValidationError, match="not permitted"):
            _validate_action("exec_shell", "synexis-demo-app")

    def test_non_sandbox_target_raises(self):
        with pytest.raises(SafetyValidationError, match="authorized sandbox container boundary"):
            _validate_action("restart_container", "postgres")

    def test_non_sandbox_target_raises_2(self):
        with pytest.raises(SafetyValidationError):
            _validate_action("stop_container", "production-db")

    def test_all_allowed_actions_pass_sandbox_target(self):
        for action in ALLOWED_ACTIONS:
            _validate_action(action, "synexis-test")


class TestProposeAction:
    def test_creates_pending_action(self):
        engine = RemediationEngine()
        result = engine.propose_action(
            action_type="restart_container",
            target="synexis-demo-app",
            reason="Testing",
        )
        assert result["status"] == "PENDING"
        assert result["action_type"] == "restart_container"
        assert result["target"] == "synexis-demo-app"
        assert "id" in result

    def test_propose_rejects_non_sandbox(self):
        engine = RemediationEngine()
        with pytest.raises(SafetyValidationError):
            engine.propose_action(
                action_type="restart_container",
                target="production-api",
                reason="Bad",
            )

    def test_propose_rejects_unknown_action(self):
        engine = RemediationEngine()
        with pytest.raises(SafetyValidationError):
            engine.propose_action(
                action_type="rm_rf_everything",
                target="synexis-demo-app",
                reason="Test",
            )


class TestApproveAndExecute:
    def test_approve_not_found_raises(self):
        engine = RemediationEngine()
        with pytest.raises(ValueError, match="not found"):
            engine.approve_and_execute("nonexistent-id")

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_successful_restart(self, mock_verifier, mock_docker):
        mock_docker.restart_container.return_value = {"status": "success", "message": "restarted"}
        mock_verifier.verify.return_value = VerificationResult(
            passed=True,
            summary="All checks passed",
            checks=[VerificationCheck(check="Status", status="PASSED", detail="running")],
        )

        engine = RemediationEngine()
        proposal = engine.propose_action(
            action_type="restart_container",
            target="synexis-demo-app",
            reason="Test restart",
        )
        result = engine.approve_and_execute(proposal["id"], approved_by="test-user")
        assert result["status"] == "SUCCESS"
        assert result["verification"]["passed"] is True

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_failed_restart_sets_failed_status(self, mock_verifier, mock_docker):
        mock_docker.restart_container.side_effect = Exception("Docker error")
        mock_verifier.verify.return_value = VerificationResult(
            passed=False,
            summary="Container check failed",
            checks=[VerificationCheck(check="Status", status="FAILED", detail="failed")],
        )

        engine = RemediationEngine()
        proposal = engine.propose_action(
            action_type="restart_container",
            target="synexis-demo-app",
            reason="Test",
        )
        result = engine.approve_and_execute(proposal["id"])
        assert result["status"] == "FAILED"

    def test_cannot_approve_twice(self):
        with patch("backend.app.core.remediation_engine.container_engine") as mock_docker, \
             patch("backend.app.core.remediation_engine.verification_engine") as mock_verifier:
            mock_docker.restart_container.return_value = {"status": "success"}
            mock_verifier.verify.return_value = VerificationResult(
                passed=True,
                summary="OK",
                checks=[VerificationCheck(check="x", status="PASSED", detail="y")],
            )
            engine = RemediationEngine()
            proposal = engine.propose_action(
                action_type="restart_container",
                target="synexis-demo-app",
                reason="Test",
            )
            engine.approve_and_execute(proposal["id"])
            with pytest.raises(ValueError, match="already been processed"):
                engine.approve_and_execute(proposal["id"])
