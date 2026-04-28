"""
End-to-End DLP Simulation Engine.
Orchestrates the 7-stage lifecycle with chained consequences.
"""
from __future__ import annotations

import json
import math
from data.scenarios import SCENARIOS, SENSITIVITY_LABELS, AVAILABLE_SITS
from engine.policy_engine import evaluate_policy, simulate_policy_on_scenarios


def get_scenario(scenario_id: str) -> dict:
    return SCENARIOS.get(scenario_id, {})


def build_stage_data(scenario_id: str, stage_number: int, previous_results: list[dict], reality_mode: bool) -> dict:
    """Build the data payload for a given stage, incorporating previous results."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    builders = {
        1: _build_stage_1,
        2: _build_stage_2,
        3: _build_stage_3,
        4: _build_stage_4,
        5: _build_stage_5,
        6: _build_stage_6,
        7: _build_stage_7,
    }

    builder = builders.get(stage_number)
    if not builder:
        return {"error": f"Invalid stage number: {stage_number}"}

    return builder(scenario, previous_results, reality_mode)


def _build_stage_1(scenario: dict, prev: list, reality_mode: bool) -> dict:
    f = scenario["file"]
    return {
        "stage": 1,
        "title": "Data Creation & Discovery",
        "description": "A file has been created in the organization. Examine the content and identify what type of sensitive information it may contain.",
        "file_name": f["name"],
        "file_type": f["type"],
        "file_size": f["size"],
        "author": f["author"] if not reality_mode else "████████████",
        "department": f["department"],
        "created": f["created"],
        "modified": f["modified"],
        "content_preview": f["content_redacted"] if reality_mode else f["content_preview"],
        "channel": scenario["channel"],
        "sender": scenario["sender"] if not reality_mode else "████@████.com",
        "reality_mode": reality_mode,
        "time_limit": 120 if reality_mode else None,
        "instructions": "Review the file content and identify the type of data. In the next stage, you'll assign a sensitivity label.",
        "questions": [
            {
                "id": "data_type_assessment",
                "question": "What type of sensitive data does this file primarily contain?",
                "options": ["Financial Data", "Health Records (PHI)", "Source Code / IP", "Personal Data (PII)", "General Business Data"],
            },
            {
                "id": "risk_assessment",
                "question": "What is your initial risk assessment for this file?",
                "options": ["Low — routine business data", "Medium — some sensitive elements", "High — clearly sensitive, needs protection", "Critical — immediate action required"],
            },
        ],
    }


def _build_stage_2(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    if prev:
        s1 = prev[0] if prev else {}
        choices = json.loads(s1.get("user_choices", "{}")) if isinstance(s1.get("user_choices"), str) else s1.get("user_choices", {})
        if choices.get("risk_assessment") == "Low — routine business data":
            cascade.append("Your Stage 1 assessment was LOW risk — this may bias your labeling decision. Careful!")

    return {
        "stage": 2,
        "title": "Sensitivity Label Assignment",
        "description": "Based on your data assessment, assign the appropriate Microsoft Purview sensitivity label.",
        "file_name": scenario["file"]["name"],
        "available_labels": SENSITIVITY_LABELS,
        "cascade_warnings": cascade,
        "reverse_mode_available": not reality_mode,
        "reverse_mode_hint": "In Reverse Mode: Given a label, identify which data types should have that label.",
        "reality_mode": reality_mode,
        "time_limit": 60 if reality_mode else None,
        "label_descriptions": {
            "Public": "No restrictions. Safe for external sharing.",
            "General": "Internal use. No sensitive data.",
            "Confidential": "Business-sensitive. Limited sharing.",
            "Highly Confidential": "Most sensitive. Strict access controls. Encryption required.",
        },
    }


def _build_stage_3(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    chosen_label = "General"
    if len(prev) >= 2:
        s2 = prev[1]
        choices = json.loads(s2.get("user_choices", "{}")) if isinstance(s2.get("user_choices"), str) else s2.get("user_choices", {})
        chosen_label = choices.get("selected_label", "General")
        if chosen_label != scenario["correct_label"]:
            cascade.append(f"You labeled this as '{chosen_label}' but the correct label is '{scenario['correct_label']}'. Policies that depend on the label may not trigger!")

    return {
        "stage": 3,
        "title": "Sensitive Information Type Detection",
        "description": "Configure which Sensitive Information Types (SITs) to detect in this content.",
        "file_name": scenario["file"]["name"],
        "chosen_label": chosen_label,
        "available_sits": AVAILABLE_SITS,
        "sits_actually_present": scenario["file"]["sits_present"] if not reality_mode else None,
        "cascade_warnings": cascade,
        "reality_mode": reality_mode,
        "time_limit": 90 if reality_mode else None,
        "hint": None if reality_mode else f"This file contains {len(scenario['file']['sits_present'])} types of sensitive data.",
    }


def _build_stage_4(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    chosen_label = "General"
    detected_sits = []

    if len(prev) >= 2:
        s2 = prev[1]
        choices = json.loads(s2.get("user_choices", "{}")) if isinstance(s2.get("user_choices"), str) else s2.get("user_choices", {})
        chosen_label = choices.get("selected_label", "General")

    if len(prev) >= 3:
        s3 = prev[2]
        choices = json.loads(s3.get("user_choices", "{}")) if isinstance(s3.get("user_choices"), str) else s3.get("user_choices", {})
        detected_sits = choices.get("selected_sits", [])
        correct_sits = set(scenario["correct_sits"])
        selected_sits = set(detected_sits)
        missed = correct_sits - selected_sits
        if missed:
            cascade.append(f"You missed detecting: {list(missed)}. Your policy may fail to catch these data types!")

    from data.scenarios import POLICY_ACTIONS
    return {
        "stage": 4,
        "title": "Policy Evaluation",
        "description": "Create a DLP policy to handle this content. Use AND/OR condition grouping, select actions, and run the simulation.",
        "file_name": scenario["file"]["name"],
        "chosen_label": chosen_label,
        "detected_sits": detected_sits,
        "channel": scenario["channel"],
        "optimal_policy_hint": scenario["optimal_policy"] if not reality_mode else None,
        "available_actions": POLICY_ACTIONS,
        "available_condition_types": [
            {"type": "sensitivity_label", "label": "Sensitivity Label", "operators": ["equals", "not_equals", "in"]},
            {"type": "content_contains_sit", "label": "Content Contains SIT", "operators": ["contains_any", "contains_all"]},
            {"type": "recipient_domain", "label": "Recipient / Destination", "operators": ["is_external", "is_internal"]},
            {"type": "sharing_scope", "label": "Sharing Scope (# recipients)", "operators": ["greater_than"]},
            {"type": "file_type", "label": "File Type", "operators": ["equals", "in"]},
            {"type": "file_size", "label": "File Size (MB)", "operators": ["greater_than"]},
        ],
        "cascade_warnings": cascade,
        "what_if_enabled": True,
        "reality_mode": reality_mode,
        "time_limit": 180 if reality_mode else None,
    }


def _build_stage_5(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    policy_matched = False
    triggered_actions = []

    if len(prev) >= 4:
        s4 = prev[3]
        result = json.loads(s4.get("computed_result", "{}")) if isinstance(s4.get("computed_result"), str) else s4.get("computed_result", {})
        policy_matched = result.get("matched", False)
        triggered_actions = result.get("triggered_actions", [])
        if not policy_matched:
            cascade.append("Your policy did NOT trigger! The incident below is generated from fallback detection. "
                           "In a real environment, this data would have leaked without intervention.")

    severity = "High"
    if policy_matched and any(a in ["Block", "block"] or (isinstance(a, dict) and a.get("id") == "block") for a in triggered_actions):
        severity = "High"
    elif policy_matched:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "stage": 5,
        "title": "Incident Creation",
        "description": "Based on the policy evaluation, a DLP incident has been generated. Review the incident details.",
        "incident": {
            "id": f"INC-{scenario['id'][:3].upper()}-{hash(scenario['id']) % 10000:04d}",
            "severity": severity,
            "status": "New",
            "policy_matched": policy_matched,
            "triggered_actions": triggered_actions,
            "file_name": scenario["file"]["name"],
            "sender": scenario["sender"],
            "channel": scenario["channel"],
            "sits_detected": [s["type"] for s in scenario["file"]["sits_present"]],
            "timestamp": scenario["file"]["modified"],
            "auto_actions_taken": _get_auto_actions(triggered_actions),
        },
        "insider_risk_signals": scenario["insider_risk_signals"] if not reality_mode else scenario["insider_risk_signals"][:2],
        "cumulative_risk_score": sum(s["risk_delta"] for s in scenario["insider_risk_signals"]),
        "cascade_warnings": cascade,
        "reality_mode": reality_mode,
        "time_limit": 120 if reality_mode else None,
    }


def _get_auto_actions(actions: list) -> list[str]:
    result = []
    for a in actions:
        label = a if isinstance(a, str) else a.get("label", a.get("id", ""))
        if "block" in label.lower():
            result.append("Content blocked from being sent")
        elif "notify" in label.lower() or "alert" in label.lower():
            result.append(f"Notification sent: {label}")
        elif "encrypt" in label.lower():
            result.append("Encryption applied to content")
        elif "quarantine" in label.lower():
            result.append("Content moved to quarantine")
    return result


def _build_stage_6(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    incident_severity = "Medium"

    if len(prev) >= 5:
        s5 = prev[4]
        result = json.loads(s5.get("computed_result", "{}")) if isinstance(s5.get("computed_result"), str) else s5.get("computed_result", {})
        incident_severity = result.get("severity", "Medium")

    from data.scenarios import ANALYST_ACTIONS
    return {
        "stage": 6,
        "title": "Analyst Decision",
        "description": "As a DLP analyst, review this incident and make a decision. Provide justification for your action.",
        "incident_severity": incident_severity,
        "available_actions": ANALYST_ACTIONS,
        "insider_risk_timeline": scenario["insider_risk_signals"],
        "cumulative_risk_score": sum(s["risk_delta"] for s in scenario["insider_risk_signals"]),
        "risk_threshold": 50,
        "behavioral_analysis": {
            "pattern": "Escalating data access and exfiltration attempts",
            "risk_trend": "Increasing",
            "anomaly_score": 0.87,
            "peer_comparison": "Activity 340% above peer average",
        },
        "cascade_warnings": cascade,
        "fp_analysis": {
            "similar_incidents_fp_rate": 0.12,
            "model_confidence": 0.91,
            "suggested_optimizations": [
                "Add minimum SIT count threshold (>5 matches) to reduce FP from partial matches",
                "Exclude internal-to-internal sharing from external-only policies",
                "Add time-of-day condition to account for scheduled batch processes",
            ],
        },
        "reality_mode": reality_mode,
        "time_limit": 120 if reality_mode else None,
    }


def _build_stage_7(scenario: dict, prev: list, reality_mode: bool) -> dict:
    cascade = []
    analyst_action = "needs_investigation"
    policy_matched = True

    if len(prev) >= 4:
        s4 = prev[3]
        result = json.loads(s4.get("computed_result", "{}")) if isinstance(s4.get("computed_result"), str) else s4.get("computed_result", {})
        policy_matched = result.get("matched", False)

    if len(prev) >= 6:
        s6 = prev[5]
        choices = json.loads(s6.get("user_choices", "{}")) if isinstance(s6.get("user_choices"), str) else s6.get("user_choices", {})
        analyst_action = choices.get("analyst_action", "needs_investigation")

    ci = scenario["compliance_impact"]

    fine_multiplier = 1.0
    if not policy_matched:
        fine_multiplier *= 1.5
        cascade.append("Policy didn't trigger → data may have leaked → fine risk increased by 50%")
    if analyst_action in ["false_positive_dismiss"]:
        fine_multiplier *= 2.0
        cascade.append("Incident dismissed as FP → no remediation → fine risk doubled")
    if analyst_action in ["needs_investigation"]:
        fine_multiplier *= 1.2
        cascade.append("Delayed investigation → slower remediation → fine risk increased by 20%")

    adjusted_fine = int(ci["max_fine"] * fine_multiplier)
    adjusted_audit_prob = min(ci["audit_probability"] * fine_multiplier, 0.99)
    adjusted_remediation = int(ci["remediation_days"] * fine_multiplier)

    return {
        "stage": 7,
        "title": "Compliance & Business Impact",
        "description": "Review the full compliance and business impact of this incident based on all decisions made throughout the simulation.",
        "regulations_violated": ci["regulations_violated"],
        "base_fine_range": ci["fine_range"],
        "adjusted_max_fine": adjusted_fine,
        "fine_multiplier": round(fine_multiplier, 2),
        "risk_level": ci["risk_level"],
        "base_audit_probability": ci["audit_probability"],
        "adjusted_audit_probability": round(adjusted_audit_prob, 2),
        "base_remediation_days": ci["remediation_days"],
        "adjusted_remediation_days": adjusted_remediation,
        "reputational_impact": ci["reputational_impact"],
        "legal_exposure": ci["legal_exposure"],
        "cascade_warnings": cascade,
        "preventive_policy_suggestion": {
            "name": f"Auto-Generated: Prevent {scenario['title']}",
            "description": "Based on this simulation, here is a recommended policy to prevent similar incidents.",
            "conditions": scenario["optimal_policy"]["conditions"],
            "logic": scenario["optimal_policy"]["logic"],
            "actions": scenario["optimal_policy"]["actions"],
        },
        "impact_timeline": [
            {"day": 1, "event": "Incident detected", "cost": 0},
            {"day": 3, "event": "Initial investigation completed", "cost": 5000},
            {"day": 7, "event": "Scope assessment finalized", "cost": 25000},
            {"day": 14, "event": "Regulatory notification (if required)", "cost": 50000},
            {"day": 30, "event": "Remediation phase", "cost": adjusted_fine // 4},
            {"day": adjusted_remediation, "event": "Full remediation + audit", "cost": adjusted_fine},
        ],
        "reality_mode": reality_mode,
    }


def evaluate_stage(scenario_id: str, stage_number: int, choices: dict, previous_results: list[dict]) -> dict:
    """Evaluate user choices for a stage and compute results, score, cascading effects."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        return {"error": "Scenario not found"}

    evaluators = {
        1: _evaluate_stage_1,
        2: _evaluate_stage_2,
        3: _evaluate_stage_3,
        4: _evaluate_stage_4,
        5: _evaluate_stage_5,
        6: _evaluate_stage_6,
        7: _evaluate_stage_7,
    }

    evaluator = evaluators.get(stage_number)
    if not evaluator:
        return {"error": f"Invalid stage number: {stage_number}"}

    return evaluator(scenario, choices, previous_results)


def _evaluate_stage_1(scenario: dict, choices: dict, prev: list) -> dict:
    correct_types = {
        "financial_leak": "Financial Data",
        "healthcare_breach": "Health Records (PHI)",
        "ip_theft_simple": "Source Code / IP",
    }
    correct = correct_types.get(scenario["id"], "")
    user_type = choices.get("data_type_assessment", "")
    user_risk = choices.get("risk_assessment", "")

    score = 0
    feedback_parts = []

    if user_type == correct:
        score += 50
        feedback_parts.append(f"Correct data type identification: {correct}")
    else:
        feedback_parts.append(f"Incorrect: you said '{user_type}' but this is '{correct}'")

    if "Critical" in user_risk or "High" in user_risk:
        score += 50
        feedback_parts.append("Good risk assessment — this data is indeed high/critical risk.")
    elif "Medium" in user_risk:
        score += 25
        feedback_parts.append("Partial credit — this data should be assessed as high/critical risk.")
    else:
        feedback_parts.append("Low risk assessment is incorrect — this is sensitive data.")

    cascade = []
    if score < 50:
        cascade.append("Poor initial assessment may lead to incorrect labeling in Stage 2.")

    return {
        "score": score,
        "max_score": 100,
        "feedback": " | ".join(feedback_parts),
        "computed_result": {"data_type": user_type, "risk_level": user_risk, "correct_type": correct},
        "cascade_effects": cascade,
    }


def _evaluate_stage_2(scenario: dict, choices: dict, prev: list) -> dict:
    correct_label = scenario["correct_label"]
    chosen = choices.get("selected_label", "General")

    label_ranks = {"Public": 0, "General": 1, "Confidential": 2, "Highly Confidential": 3}
    correct_rank = label_ranks.get(correct_label, 0)
    chosen_rank = label_ranks.get(chosen, 0)

    score = 0
    feedback_parts = []
    cascade = []

    if chosen == correct_label:
        score = 100
        feedback_parts.append(f"Perfect! '{chosen}' is the correct sensitivity label.")
    elif abs(chosen_rank - correct_rank) == 1:
        score = 50
        feedback_parts.append(f"Close — '{chosen}' is one level off. Correct: '{correct_label}'.")
        if chosen_rank < correct_rank:
            cascade.append(f"Under-labeling: '{chosen}' is less restrictive than needed. Policies requiring '{correct_label}' won't trigger.")
    else:
        score = 10
        feedback_parts.append(f"Incorrect label '{chosen}'. Correct: '{correct_label}'.")
        if chosen_rank < correct_rank:
            cascade.append(f"Severe under-labeling! '{chosen}' is much less restrictive than '{correct_label}'. Most DLP policies will not trigger.")
        else:
            cascade.append(f"Over-labeling: '{chosen}' is more restrictive than needed. May cause unnecessary blocks and user friction.")

    return {
        "score": score,
        "max_score": 100,
        "feedback": " | ".join(feedback_parts),
        "computed_result": {"selected_label": chosen, "correct_label": correct_label, "label_gap": chosen_rank - correct_rank},
        "cascade_effects": cascade,
    }


def _evaluate_stage_3(scenario: dict, choices: dict, prev: list) -> dict:
    correct_sits = set(scenario["correct_sits"])
    selected_sits = set(choices.get("selected_sits", []))

    tp = len(correct_sits & selected_sits)
    fp = len(selected_sits - correct_sits)
    fn = len(correct_sits - selected_sits)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    score = round(f1 * 100)

    feedback_parts = []
    cascade = []

    if f1 == 1.0:
        feedback_parts.append("Perfect SIT detection! All correct types identified with no false positives.")
    else:
        if fn > 0:
            missed = list(correct_sits - selected_sits)
            feedback_parts.append(f"Missed SITs: {missed}")
            cascade.append(f"Missed SITs ({missed}) won't be caught by policies that look for them.")
        if fp > 0:
            extra = list(selected_sits - correct_sits)
            feedback_parts.append(f"False positive SITs: {extra}")
            cascade.append(f"Extra SITs ({extra}) may cause unnecessary policy triggers (false positives).")

    return {
        "score": score,
        "max_score": 100,
        "feedback": " | ".join(feedback_parts) if feedback_parts else "Good detection accuracy.",
        "computed_result": {
            "selected_sits": list(selected_sits),
            "correct_sits": list(correct_sits),
            "tp": tp, "fp": fp, "fn": fn,
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
        },
        "cascade_effects": cascade,
    }


def _evaluate_stage_4(scenario: dict, choices: dict, prev: list) -> dict:
    chosen_label = "General"
    detected_sits = []
    if len(prev) >= 2:
        s2_choices = json.loads(prev[1].get("user_choices", "{}")) if isinstance(prev[1].get("user_choices"), str) else prev[1].get("user_choices", {})
        chosen_label = s2_choices.get("selected_label", "General")
    if len(prev) >= 3:
        s3_choices = json.loads(prev[2].get("user_choices", "{}")) if isinstance(prev[2].get("user_choices"), str) else prev[2].get("user_choices", {})
        detected_sits = s3_choices.get("selected_sits", [])

    user_policy = choices.get("policy", {})
    if not user_policy.get("condition_groups"):
        user_policy["condition_groups"] = [{"logic": "AND", "conditions": choices.get("conditions", [])}]
    if not user_policy.get("actions"):
        user_policy["actions"] = choices.get("actions", [])
    if not user_policy.get("name"):
        user_policy["name"] = choices.get("policy_name", "User Policy")

    context = {
        "label": chosen_label,
        "detected_sits": detected_sits,
        "channel": scenario["channel"],
        "file_type": scenario["file"]["type"],
        "file_size_mb": float(scenario["file"]["size"].replace(" MB", "").replace(" KB", "")),
        "sharing_scope": 25 if "Teams" in scenario["channel"] else 1,
    }

    result = evaluate_policy(user_policy, context)

    optimal_context = {
        "label": scenario["correct_label"],
        "detected_sits": scenario["correct_sits"],
        "channel": scenario["channel"],
        "file_type": scenario["file"]["type"],
        "file_size_mb": float(scenario["file"]["size"].replace(" MB", "").replace(" KB", "")),
        "sharing_scope": 25 if "Teams" in scenario["channel"] else 1,
    }
    optimal_result = evaluate_policy(
        {
            "name": scenario["optimal_policy"]["name"],
            "condition_groups": [{"logic": scenario["optimal_policy"]["logic"], "conditions": scenario["optimal_policy"]["conditions"]}],
            "group_logic": "AND",
            "actions": scenario["optimal_policy"]["actions"],
        },
        optimal_context,
    )

    score = 0
    feedback_parts = []
    cascade = []

    should_match = True
    if result["matched"] == should_match:
        score += 50
        feedback_parts.append("Policy correctly triggered on this scenario.")
    else:
        feedback_parts.append("Policy did NOT trigger. In production, this data would leak!")
        cascade.append("Policy failure: no automatic protection applied. Data at risk of exfiltration.")

    user_actions = set()
    for a in result.get("triggered_actions", []):
        if isinstance(a, str):
            user_actions.add(a.lower())
        elif isinstance(a, dict):
            user_actions.add(a.get("id", a.get("label", "")).lower())

    has_block = any("block" in a for a in user_actions)
    has_notify = any("notify" in a or "alert" in a for a in user_actions)
    has_incident = any("incident" in a for a in user_actions)

    if has_block:
        score += 20
    if has_notify:
        score += 15
    if has_incident:
        score += 15

    action_feedback = []
    if not has_block:
        action_feedback.append("Missing 'Block' action — content won't be stopped")
    if not has_notify:
        action_feedback.append("Missing notification action — no one gets alerted")
    if not has_incident:
        action_feedback.append("Missing 'Generate Incident' — no audit trail")

    if action_feedback:
        feedback_parts.append("Action gaps: " + "; ".join(action_feedback))

    return {
        "score": score,
        "max_score": 100,
        "feedback": " | ".join(feedback_parts),
        "computed_result": {
            "matched": result["matched"],
            "triggered_actions": result["triggered_actions"],
            "explanation": result["explanation"],
            "group_results": result["group_results"],
            "optimal_policy_result": optimal_result["matched"],
        },
        "cascade_effects": cascade,
    }


def _evaluate_stage_5(scenario: dict, choices: dict, prev: list) -> dict:
    acknowledged = choices.get("acknowledged", False)
    notes = choices.get("investigation_notes", "")
    priority = choices.get("assigned_priority", "Medium")

    score = 0
    if acknowledged:
        score += 40
    if len(notes) > 20:
        score += 30
    if priority in ["High", "Critical"]:
        score += 30
    elif priority == "Medium":
        score += 15

    policy_matched = True
    if len(prev) >= 4:
        s4_result = json.loads(prev[3].get("computed_result", "{}")) if isinstance(prev[3].get("computed_result"), str) else prev[3].get("computed_result", {})
        policy_matched = s4_result.get("matched", True)

    severity = "High" if policy_matched else "Low"

    return {
        "score": min(score, 100),
        "max_score": 100,
        "feedback": f"Incident reviewed. Priority set to {priority}. {'Good notes provided.' if len(notes) > 20 else 'Consider adding more detailed investigation notes.'}",
        "computed_result": {"severity": severity, "priority": priority, "notes": notes, "acknowledged": acknowledged},
        "cascade_effects": [],
    }


def _evaluate_stage_6(scenario: dict, choices: dict, prev: list) -> dict:
    action = choices.get("analyst_action", "needs_investigation")
    justification = choices.get("justification", "")

    correct_actions = {"true_positive_block", "true_positive_escalate", "true_positive_remediate", "insider_risk_referral"}

    score = 0
    feedback_parts = []
    cascade = []

    if action in correct_actions:
        score += 60
        feedback_parts.append("Correct action — this is a true positive that requires intervention.")
    elif action == "needs_investigation":
        score += 30
        feedback_parts.append("Further investigation is acceptable but delays remediation.")
        cascade.append("Delayed response increases risk exposure window.")
    elif "false_positive" in action:
        score += 0
        feedback_parts.append("CRITICAL ERROR: This is a true positive, not a false positive! Dismissing allows data leakage.")
        cascade.append("Incident dismissed incorrectly — data leak not prevented. Major compliance violation.")

    if action == "insider_risk_referral":
        risk_score = sum(s["risk_delta"] for s in scenario["insider_risk_signals"])
        if risk_score > 50:
            score += 20
            feedback_parts.append(f"Excellent — insider risk score ({risk_score}) exceeds threshold, referral is warranted.")

    if len(justification) > 30:
        score += 20
        feedback_parts.append("Good justification provided.")
    elif len(justification) > 10:
        score += 10
        feedback_parts.append("Justification could be more detailed.")
    else:
        feedback_parts.append("Insufficient justification — real analysts must document their reasoning.")

    return {
        "score": min(score, 100),
        "max_score": 100,
        "feedback": " | ".join(feedback_parts),
        "computed_result": {"analyst_action": action, "justification": justification, "action_category": _get_action_category(action)},
        "cascade_effects": cascade,
    }


def _get_action_category(action: str) -> str:
    if "true_positive" in action:
        return "correct_detection"
    if "false_positive" in action:
        return "missed_detection"
    if "insider" in action:
        return "escalation"
    return "investigation"


def _evaluate_stage_7(scenario: dict, choices: dict, prev: list) -> dict:
    acknowledged_impact = choices.get("acknowledged_impact", False)
    remediation_plan = choices.get("remediation_plan", "")
    accept_policy = choices.get("accept_preventive_policy", False)

    score = 0
    if acknowledged_impact:
        score += 30
    if len(remediation_plan) > 20:
        score += 40
    elif len(remediation_plan) > 5:
        score += 20
    if accept_policy:
        score += 30

    return {
        "score": min(score, 100),
        "max_score": 100,
        "feedback": f"Compliance review complete. {'Preventive policy accepted.' if accept_policy else 'Consider accepting the preventive policy to improve defenses.'}",
        "computed_result": {
            "acknowledged": acknowledged_impact,
            "remediation_plan": remediation_plan,
            "accepted_preventive_policy": accept_policy,
        },
        "cascade_effects": [],
    }


def compute_what_if(scenario_id: str, stage_number: int, original_choices: dict,
                     alternative_choices: dict, previous_results: list[dict]) -> dict:
    """Compare outcomes of original vs alternative choices at a given stage."""
    original_eval = evaluate_stage(scenario_id, stage_number, original_choices, previous_results)
    alt_eval = evaluate_stage(scenario_id, stage_number, alternative_choices, previous_results)

    score_delta = alt_eval["score"] - original_eval["score"]
    cascade_delta = len(alt_eval["cascade_effects"]) - len(original_eval["cascade_effects"])

    summary_parts = []
    if score_delta > 0:
        summary_parts.append(f"Score would improve by {score_delta} points.")
    elif score_delta < 0:
        summary_parts.append(f"Score would decrease by {abs(score_delta)} points.")
    else:
        summary_parts.append("Score would remain the same.")

    if cascade_delta < 0:
        summary_parts.append(f"{abs(cascade_delta)} fewer cascade warnings.")
    elif cascade_delta > 0:
        summary_parts.append(f"{cascade_delta} additional cascade warnings.")

    return {
        "original_outcome": {
            "score": original_eval["score"],
            "feedback": original_eval["feedback"],
            "cascade_effects": original_eval["cascade_effects"],
        },
        "alternative_outcome": {
            "score": alt_eval["score"],
            "feedback": alt_eval["feedback"],
            "cascade_effects": alt_eval["cascade_effects"],
        },
        "delta_summary": " ".join(summary_parts),
        "impact_analysis": {
            "score_delta": score_delta,
            "cascade_delta": cascade_delta,
            "recommendation": "Use alternative choices" if score_delta > 0 else "Keep original choices",
        },
    }
