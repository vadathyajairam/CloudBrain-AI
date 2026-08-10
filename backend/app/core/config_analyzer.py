import re
import yaml
from typing import Dict, Any, List

SAMPLE_CONFIGS = {
    "docker_compose_vulnerable": """version: '3.8'
services:
  backend:
    image: mybackend:latest
    ports:
      - "5000:5000"
    environment:
      - DB_PASSWORD=super_secret_db_pass_12345
      - AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE
    privileged: true
    restart: always

  database:
    image: postgres:latest
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=rootpassword
    volumes:
      - ./data:/var/lib/postgresql/data

  analytics:
    image: custom-analytics
    ports:
      - "5000:5000" # Conflict with backend!
""",

    "dockerfile_vulnerable": """FROM python:3.10
USER root
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
ENV API_KEY="sk-proj-9923849182391283"
EXPOSE 8000
CMD ["python", "main.py"]
""",

    "k8s_manifest_vulnerable": """apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudbrain-api
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: api
        image: api-service:latest
        securityContext:
          privileged: true
          runAsUser: 0
        # Missing resources.limits and resources.requests
        # Missing livenessProbe and readinessProbe
"""
}

class ConfigAnalyzer:
    def audit_config(self, file_type: str, content: str) -> Dict[str, Any]:
        issues: List[Dict[str, Any]] = []
        
        if file_type in ("docker-compose", "yaml", "yml"):
            issues.extend(self._audit_compose(content))
        elif file_type == "dockerfile":
            issues.extend(self._audit_dockerfile(content))
        elif file_type in ("k8s", "kubernetes"):
            issues.extend(self._audit_k8s(content))
        else:
            # General text check
            issues.extend(self._audit_general(content))

        # Calculate scores
        critical_count = sum(1 for i in issues if i["severity"] == "CRITICAL")
        high_count = sum(1 for i in issues if i["severity"] == "HIGH")
        medium_count = sum(1 for i in issues if i["severity"] == "MEDIUM")
        low_count = sum(1 for i in issues if i["severity"] == "LOW")

        penalty = (critical_count * 25) + (high_count * 15) + (medium_count * 8) + (low_count * 3)
        score = max(0, 100 - penalty)
        
        grade = "A+" if score >= 95 else "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 50 else "F"

        return {
            "file_type": file_type,
            "score": score,
            "grade": grade,
            "summary": {
                "total_issues": len(issues),
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count,
                "low": low_count
            },
            "issues": issues,
            "status": "PASS" if critical_count == 0 and high_count == 0 else "FAIL"
        }

    def _audit_compose(self, content: str) -> List[Dict[str, Any]]:
        issues = []
        try:
            parsed = yaml.safe_load(content)
            if not isinstance(parsed, dict) or "services" not in parsed:
                return [{"severity": "HIGH", "category": "Syntax", "title": "Missing 'services' root block", "detail": "Valid docker-compose must declare services.", "recommendation": "Add a top-level 'services:' section."}]
            
            services = parsed.get("services", {})
            allocated_ports: Dict[str, str] = {}
            
            for sname, sdef in services.items():
                if not isinstance(sdef, dict):
                    continue
                    
                # 1. Check for :latest image tags
                img = sdef.get("image", "")
                if ":latest" in img or (img and ":" not in img):
                    issues.append({
                        "severity": "MEDIUM",
                        "category": "Reliability",
                        "service": sname,
                        "title": f"Unpinned image tag in '{sname}'",
                        "detail": f"Service uses '{img}'. Unpinned tags can break production during unexpected upstream updates.",
                        "recommendation": f"Pin image to an exact semver tag (e.g., {img.split(':')[0]}:1.4.2)."
                    })
                    
                # 2. Check for port conflicts
                ports = sdef.get("ports", [])
                for p in ports:
                    p_str = str(p)
                    host_port = p_str.split(":")[0].strip() if ":" in p_str else p_str.strip()
                    if host_port in allocated_ports:
                        issues.append({
                            "severity": "CRITICAL",
                            "category": "Networking",
                            "service": sname,
                            "title": f"Port Collision on Host Port {host_port}",
                            "detail": f"Port '{host_port}' is mapped by both '{allocated_ports[host_port]}' and '{sname}'.",
                            "recommendation": f"Change host port for '{sname}' (e.g., '5001:{host_port}')."
                        })
                    else:
                        allocated_ports[host_port] = sname
                        
                # 3. Check for privileged mode
                if sdef.get("privileged") is True:
                    issues.append({
                        "severity": "CRITICAL",
                        "category": "Security",
                        "service": sname,
                        "title": f"Container '{sname}' runs in Privileged Mode",
                        "detail": "Privileged mode grants container full access to host kernel capabilities and devices, allowing container escape.",
                        "recommendation": "Remove 'privileged: true' and grant only required Linux capabilities via 'cap_add'."
                    })

                # 4. Check for missing resource limits
                deploy = sdef.get("deploy", {})
                resources = deploy.get("resources", {}) if isinstance(deploy, dict) else {}
                if not resources or not resources.get("limits"):
                    issues.append({
                        "severity": "LOW",
                        "category": "Resource Management",
                        "service": sname,
                        "title": f"Missing CPU/Memory resource limits for '{sname}'",
                        "detail": "Without resource limits, a memory leak or CPU spike in this container can starve other host processes.",
                        "recommendation": "Define deploy.resources.limits (e.g. cpus: '0.50', memory: 512M)."
                    })

                # 5. Check for hardcoded secrets in environment
                env = sdef.get("environment", {})
                env_items = env.items() if isinstance(env, dict) else [(item.split("=")[0], item.split("=")[1]) for item in env if isinstance(item, str) and "=" in item]
                for k, v in env_items:
                    k_upper = str(k).upper()
                    if any(secret_kw in k_upper for secret_kw in ("PASSWORD", "SECRET", "API_KEY", "TOKEN", "PRIVATE_KEY")):
                        v_str = str(v)
                        if not (v_str.startswith("${") or v_str.startswith("$")):
                            issues.append({
                                "severity": "HIGH",
                                "category": "Security",
                                "service": sname,
                                "title": f"Hardcoded secret in environment variable '{k}'",
                                "detail": f"Plaintext secret detected in config for service '{sname}'.",
                                "recommendation": f"Use environment substitution (e.g., {k}=${{{k}}}) or Docker secrets manager."
                            })

        except Exception as e:
            issues.append({
                "severity": "HIGH",
                "category": "Syntax Error",
                "title": "YAML Parsing Failed",
                "detail": str(e),
                "recommendation": "Ensure YAML syntax is properly indented without tab characters."
            })
            
        return issues

    def _audit_dockerfile(self, content: str) -> List[Dict[str, Any]]:
        issues = []
        lines = content.splitlines()
        
        has_user_directive = False
        for idx, line in enumerate(lines, 1):
            line_strip = line.strip()
            
            # Root user check
            if line_strip.startswith("USER"):
                has_user_directive = True
                user_val = line_strip.replace("USER", "").strip()
                if user_val in ("root", "0"):
                    issues.append({
                        "severity": "HIGH",
                        "category": "Security",
                        "line": idx,
                        "title": "Explicit Root User Directive",
                        "detail": "Running containers as root violates principle of least privilege.",
                        "recommendation": "Create and switch to a non-privileged user: RUN useradd -m appuser && USER appuser"
                    })
                    
            # Hardcoded API keys / tokens
            if re.search(r'(ENV|ARG)\s+.*(API_KEY|SECRET|PASSWORD|TOKEN)=["\']?[a-zA-Z0-9_-]{10,}', line_strip, re.IGNORECASE):
                issues.append({
                    "severity": "CRITICAL",
                    "category": "Security",
                    "line": idx,
                    "title": "Hardcoded Secret in Dockerfile layer",
                    "detail": "Secrets declared in ENV or ARG directives remain permanently baked into intermediate image layers.",
                    "recommendation": "Inject secrets at runtime via container orchestrator or use BuildKit secret mounts (--mount=type=secret)."
                })
                
            # Latest base image check
            if line_strip.startswith("FROM"):
                base_img = line_strip.replace("FROM", "").strip().split(" ")[0]
                if ":latest" in base_img or (":" not in base_img and "scratch" not in base_img):
                    issues.append({
                        "severity": "MEDIUM",
                        "category": "Reliability",
                        "line": idx,
                        "title": f"Unpinned Base Image '{base_img}'",
                        "detail": "Using :latest or untagged base images causes non-deterministic builds.",
                        "recommendation": f"Pin base image with explicit tag (e.g., FROM {base_img.split(':')[0]}:3.11-slim)."
                    })

        if not has_user_directive:
            issues.append({
                "severity": "MEDIUM",
                "category": "Security",
                "title": "Missing USER directive (defaults to root)",
                "detail": "The Dockerfile does not specify a USER directive, meaning commands will execute as root by default.",
                "recommendation": "Add 'USER nonroot' before the ENTRYPOINT/CMD directive."
            })
            
        return issues

    def _audit_k8s(self, content: str) -> List[Dict[str, Any]]:
        issues = []
        try:
            docs = list(yaml.safe_load_all(content))
            for doc in docs:
                if not isinstance(doc, dict):
                    continue
                kind = doc.get("kind", "")
                name = doc.get("metadata", {}).get("name", "unnamed")
                
                if kind in ("Deployment", "StatefulSet", "DaemonSet", "Pod"):
                    spec = doc.get("spec", {})
                    if kind != "Pod":
                        spec = spec.get("template", {}).get("spec", {})
                        
                    containers = spec.get("containers", [])
                    for c in containers:
                        cname = c.get("name", "main")
                        
                        # Missing resource limits
                        if not c.get("resources", {}).get("limits"):
                            issues.append({
                                "severity": "HIGH",
                                "category": "Resource Management",
                                "title": f"No Resource Limits for container '{cname}' in {kind}/{name}",
                                "detail": "Kubernetes pods without resource limits can cause Node resource starvation.",
                                "recommendation": "Add resources.limits (cpu & memory) and resources.requests."
                            })
                            
                        # Missing probes
                        if not c.get("livenessProbe") or not c.get("readinessProbe"):
                            issues.append({
                                "severity": "MEDIUM",
                                "category": "High Availability",
                                "title": f"Missing Health Probes for container '{cname}'",
                                "detail": "Without liveness and readiness probes, Kubernetes cannot self-heal deadlocks or route traffic safely.",
                                "recommendation": "Configure livenessProbe (httpGet/tcpSocket) and readinessProbe."
                            })

        except Exception as e:
            issues.append({
                "severity": "HIGH",
                "category": "Syntax Error",
                "title": "K8s YAML Parse Error",
                "detail": str(e),
                "recommendation": "Check Kubernetes manifest syntax."
            })
        return issues

    def _audit_general(self, content: str) -> List[Dict[str, Any]]:
        issues = []
        if "PRIVATE KEY-----" in content:
            issues.append({
                "severity": "CRITICAL",
                "category": "Security",
                "title": "Exposed Private Key",
                "detail": "File contains plaintext cryptographic private key.",
                "recommendation": "Store keys securely in HashiCorp Vault or Cloud KMS."
            })
        return issues

config_analyzer = ConfigAnalyzer()
