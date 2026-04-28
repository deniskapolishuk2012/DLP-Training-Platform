"""
API routes for standalone modules:
Policy Simulator, Incident Simulator, Label Lab, SIT Builder,
False Positive Lab, Insider Risk, Compliance Lab.
"""

from fastapi import APIRouter
from data.scenarios import (
    SCENARIOS, SENSITIVITY_LABELS, AVAILABLE_SITS,
    POLICY_ACTIONS, ANALYST_ACTIONS,
)
from engine.policy_engine import evaluate_policy, simulate_policy_on_scenarios, what_if_policy

router = APIRouter(prefix="/api/modules", tags=["modules"])


# ── Policy Simulator ─────────────────────────────────────────────
@router.post("/policy/evaluate")
def policy_evaluate(payload: dict):
    """Evaluate a single policy against a context."""
    policy = payload.get("policy", {})
    context = payload.get("context", {})
    return evaluate_policy(policy, context)


@router.post("/policy/simulate")
def policy_simulate(payload: dict):
    """Run policy against multiple scenarios with metrics."""
    policy = payload.get("policy", {})
    scenarios = payload.get("scenarios", [])
    return simulate_policy_on_scenarios(policy, scenarios)


@router.post("/policy/what_if")
def policy_what_if(payload: dict):
    """Compare two policies on the same context."""
    original = payload.get("original_policy", {})
    modified = payload.get("modified_policy", {})
    context = payload.get("context", {})
    return what_if_policy(original, modified, context)


@router.get("/policy/condition_types")
def get_condition_types():
    return [
        {"type": "sensitivity_label", "label": "Sensitivity Label", "operators": ["equals", "not_equals", "in"]},
        {"type": "content_contains_sit", "label": "Content Contains SIT", "operators": ["contains_any", "contains_all"]},
        {"type": "recipient_domain", "label": "Recipient / Destination", "operators": ["is_external", "is_internal"]},
        {"type": "sharing_scope", "label": "Sharing Scope", "operators": ["greater_than"]},
        {"type": "file_type", "label": "File Type", "operators": ["equals", "in"]},
        {"type": "file_size", "label": "File Size (MB)", "operators": ["greater_than"]},
    ]


@router.get("/policy/actions")
def get_policy_actions():
    return POLICY_ACTIONS


# ── Incident Simulator ───────────────────────────────────────────
@router.post("/incident/evaluate")
def incident_evaluate(payload: dict):
    """Evaluate analyst decision on an incident."""
    action = payload.get("action", "")
    justification = payload.get("justification", "")
    incident_type = payload.get("incident_type", "true_positive")

    correct_actions = {"true_positive_block", "true_positive_escalate", "true_positive_remediate", "insider_risk_referral"}
    fp_actions = {"false_positive_dismiss", "false_positive_tune"}

    if incident_type == "true_positive":
        if action in correct_actions:
            score = 80 + (20 if len(justification) > 30 else 10 if len(justification) > 10 else 0)
            return {"score": min(score, 100), "correct": True, "feedback": "Correct — true positive handled appropriately."}
        elif action in fp_actions:
            return {"score": 0, "correct": False, "feedback": "WRONG — this was a true positive. Dismissing as FP allows data leakage."}
        else:
            return {"score": 40, "correct": False, "feedback": "Investigation is acceptable but the data clearly warrants action."}
    else:
        if action in fp_actions:
            score = 80 + (20 if len(justification) > 30 else 10)
            return {"score": min(score, 100), "correct": True, "feedback": "Correct — false positive identified and handled."}
        elif action in correct_actions:
            return {"score": 20, "correct": False, "feedback": "This was actually a false positive. Blocking causes user friction unnecessarily."}
        else:
            return {"score": 50, "correct": False, "feedback": "Further investigation on an FP wastes analyst time."}


@router.get("/incident/actions")
def get_analyst_actions():
    return ANALYST_ACTIONS


# ── Label Lab ─────────────────────────────────────────────────────
@router.get("/labels")
def get_labels():
    return SENSITIVITY_LABELS


@router.post("/labels/evaluate")
def evaluate_label(payload: dict):
    """Evaluate if the assigned label is correct."""
    scenario_id = payload.get("scenario_id", "")
    selected_label = payload.get("selected_label", "")

    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    correct = scenario["correct_label"]
    label_ranks = {"Public": 0, "General": 1, "Confidential": 2, "Highly Confidential": 3}

    if selected_label == correct:
        return {"correct": True, "score": 100, "feedback": f"'{selected_label}' is correct.", "correct_label": correct}

    diff = label_ranks.get(selected_label, 0) - label_ranks.get(correct, 0)
    if diff < 0:
        return {"correct": False, "score": 30, "feedback": f"Under-labeled. '{selected_label}' is too low. Correct: '{correct}'.", "correct_label": correct}
    else:
        return {"correct": False, "score": 50, "feedback": f"Over-labeled. '{selected_label}' is too restrictive. Correct: '{correct}'.", "correct_label": correct}


@router.post("/labels/reverse")
def reverse_label(payload: dict):
    """Given a label, list which data types should have that label."""
    label = payload.get("label", "General")
    mapping = {
        "Public": ["Press releases", "Marketing materials", "Published financial reports"],
        "General": ["Internal memos", "Meeting notes", "Non-sensitive emails"],
        "Confidential": ["Customer lists", "Contract terms", "Internal financial projections"],
        "Highly Confidential": ["M&A documents", "Material non-public information", "Patient health records", "Source code with API keys", "Unannounced earnings"],
    }
    return {"label": label, "data_types": mapping.get(label, [])}


# ── SIT Builder ───────────────────────────────────────────────────
@router.get("/sits")
def get_sits():
    return AVAILABLE_SITS


@router.post("/sits/test")
def test_sit_detection(payload: dict):
    """Test which SITs match in a given content."""
    scenario_id = payload.get("scenario_id", "")
    selected_sits = payload.get("selected_sits", [])

    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    present = {s["type"] for s in scenario["file"]["sits_present"]}
    selected = set(selected_sits)

    return {
        "true_positives": list(selected & present),
        "false_positives": list(selected - present),
        "false_negatives": list(present - selected),
        "precision": round(len(selected & present) / len(selected), 3) if selected else 0,
        "recall": round(len(selected & present) / len(present), 3) if present else 0,
    }


# ── False Positive Lab ───────────────────────────────────────────
@router.post("/fp/analyze")
def analyze_false_positives(payload: dict):
    """Analyze FP patterns and provide optimization suggestions."""
    fp_sits = payload.get("false_positive_sits", [])
    policy_conditions = payload.get("policy_conditions", [])

    suggestions = []
    for fp in fp_sits:
        suggestions.append({
            "sit": fp,
            "suggestion": f"Consider removing '{fp}' from detection or adding a minimum count threshold.",
            "expected_fp_reduction": "15-25%",
        })

    if len(fp_sits) > 2:
        suggestions.append({
            "sit": "General",
            "suggestion": "Multiple FPs detected. Consider narrowing your SIT selection to only the most relevant types for this data category.",
            "expected_fp_reduction": "30-50%",
        })

    return {
        "total_fps": len(fp_sits),
        "suggestions": suggestions,
        "ai_recommendation": "Focus on high-confidence SITs with low FP rates. Use content-aware conditions (e.g., proximity rules, keyword context) to reduce noise.",
    }


# ── Insider Risk ──────────────────────────────────────────────────
@router.post("/insider/analyze")
def analyze_insider_risk(payload: dict):
    """Analyze insider risk signals for a scenario."""
    scenario_id = payload.get("scenario_id", "")
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    signals = scenario["insider_risk_signals"]
    cumulative = 0
    timeline = []
    for s in signals:
        cumulative += s["risk_delta"]
        timeline.append({**s, "cumulative_score": cumulative})

    return {
        "timeline": timeline,
        "final_risk_score": cumulative,
        "risk_level": "Critical" if cumulative > 60 else "High" if cumulative > 40 else "Medium" if cumulative > 20 else "Low",
        "threshold": 50,
        "exceeded_threshold": cumulative > 50,
        "recommendation": "Refer to Insider Risk team immediately" if cumulative > 50 else "Continue monitoring",
    }


# ── Compliance Lab ────────────────────────────────────────────────
@router.post("/compliance/impact")
def compliance_impact(payload: dict):
    """Get full compliance impact for a scenario."""
    scenario_id = payload.get("scenario_id", "")
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    ci = scenario["compliance_impact"]
    return {
        "regulations": ci["regulations_violated"],
        "max_fine": ci["max_fine"],
        "fine_range": ci["fine_range"],
        "risk_level": ci["risk_level"],
        "audit_probability": ci["audit_probability"],
        "remediation_days": ci["remediation_days"],
        "reputational_impact": ci["reputational_impact"],
        "legal_exposure": ci["legal_exposure"],
    }


@router.post("/compliance/generate_policy")
def generate_preventive_policy(payload: dict):
    """Generate a preventive policy based on a scenario's compliance requirements."""
    scenario_id = payload.get("scenario_id", "")
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    op = scenario["optimal_policy"]
    return {
        "name": f"Preventive: {op['name']}",
        "conditions": op["conditions"],
        "logic": op["logic"],
        "actions": op["actions"],
        "rationale": f"This policy addresses violations of {', '.join(scenario['compliance_impact']['regulations_violated'])} by detecting and blocking the specific data types involved.",
    }
