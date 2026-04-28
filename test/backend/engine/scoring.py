"""
Final Scorecard Engine.
Computes overall and per-dimension scores with recommendations.
"""
from __future__ import annotations

import json


def compute_scorecard(session_data: dict, stage_results: list[dict]) -> dict:
    """Compute the final scorecard from all stage results."""
    stages = {}
    for sr in stage_results:
        sn = sr.get("stage_number", 0)
        stages[sn] = {
            "score": sr.get("score", 0),
            "max_score": sr.get("max_score", 100),
            "choices": json.loads(sr["user_choices"]) if isinstance(sr.get("user_choices"), str) else sr.get("user_choices", {}),
            "result": json.loads(sr["computed_result"]) if isinstance(sr.get("computed_result"), str) else sr.get("computed_result", {}),
            "cascade": json.loads(sr["cascade_effects"]) if isinstance(sr.get("cascade_effects"), str) else sr.get("cascade_effects", []),
        }

    labeling_score = stages.get(2, {}).get("score", 0)
    detection_score = stages.get(3, {}).get("score", 0)
    policy_eff = stages.get(4, {}).get("score", 0)
    decision_quality = stages.get(6, {}).get("score", 0)
    compliance = stages.get(7, {}).get("score", 0)

    s3_result = stages.get(3, {}).get("result", {})
    fp_count = s3_result.get("fp", 0)
    precision = s3_result.get("precision", 1)
    fp_impact = round(precision * 100)

    insider_score = 0
    s6_result = stages.get(6, {}).get("result", {})
    if s6_result.get("action_category") == "escalation":
        insider_score = 100
    elif s6_result.get("action_category") == "correct_detection":
        insider_score = 70
    elif s6_result.get("action_category") == "investigation":
        insider_score = 40
    else:
        insider_score = 0

    weights = {
        "labeling": 0.15,
        "detection": 0.15,
        "policy_effectiveness": 0.20,
        "decision_quality": 0.20,
        "fp_impact": 0.10,
        "insider_risk": 0.10,
        "compliance": 0.10,
    }

    overall = round(
        labeling_score * weights["labeling"]
        + detection_score * weights["detection"]
        + policy_eff * weights["policy_effectiveness"]
        + decision_quality * weights["decision_quality"]
        + fp_impact * weights["fp_impact"]
        + insider_score * weights["insider_risk"]
        + compliance * weights["compliance"]
    )

    all_cascades = []
    for sn in sorted(stages.keys()):
        for c in stages[sn].get("cascade", []):
            all_cascades.append({"stage": sn, "effect": c})

    recommendations = _generate_recommendations(
        labeling_score, detection_score, policy_eff,
        decision_quality, fp_impact, insider_score, compliance, all_cascades
    )

    return {
        "overall_score": overall,
        "labeling_score": labeling_score,
        "detection_score": detection_score,
        "policy_effectiveness": policy_eff,
        "decision_quality": decision_quality,
        "fp_impact": fp_impact,
        "insider_risk_score": insider_score,
        "compliance_score": compliance,
        "recommendations": recommendations,
        "cascade_summary": all_cascades,
        "detail_breakdown": {
            "stage_scores": {str(k): {"score": v["score"], "max": v["max_score"]} for k, v in stages.items()},
            "weights": weights,
            "grade": _get_grade(overall),
        },
    }


def _get_grade(score: float) -> str:
    if score >= 90:
        return "A — Expert DLP Engineer"
    if score >= 80:
        return "B — Senior Analyst"
    if score >= 70:
        return "C — Competent Analyst"
    if score >= 60:
        return "D — Needs Improvement"
    return "F — Significant Gaps"


def _generate_recommendations(labeling, detection, policy, decision, fp, insider, compliance, cascades) -> list[str]:
    recs = []

    if labeling < 70:
        recs.append("Labeling: Review Microsoft Purview sensitivity label hierarchy. Practice matching data types to appropriate labels — under-labeling is the #1 cause of DLP bypass.")
    if detection < 70:
        recs.append("Detection: Study Sensitive Information Types (SITs) more thoroughly. Missing critical SITs means your policies have blind spots.")
    if policy < 70:
        recs.append("Policy Design: Your DLP policy needs improvement. Use AND/OR condition grouping effectively, and always include Block + Notify + Generate Incident actions for high-risk scenarios.")
    if decision < 70:
        recs.append("Analyst Decisions: Practice incident triage. True positives should never be dismissed. Always provide detailed justification and consider insider risk signals.")
    if fp < 70:
        recs.append("False Positive Management: Your SIT selection created too many false positives. Use more specific SIT types and add count thresholds to reduce noise.")
    if insider < 50:
        recs.append("Insider Risk: Pay attention to behavioral timelines and cumulative risk scores. When risk exceeds thresholds, escalate to the Insider Risk team.")
    if compliance < 70:
        recs.append("Compliance: Always acknowledge regulatory impact and create remediation plans. Accept preventive policy suggestions to strengthen your posture.")

    cascade_count = len(cascades)
    if cascade_count > 3:
        recs.append(f"Cascade Effects: Your decisions created {cascade_count} cascading issues. Early mistakes (labeling, detection) propagated through the entire lifecycle. Focus on getting the fundamentals right.")

    if not recs:
        recs.append("Excellent performance across all dimensions! Consider trying Reality Mode for an additional challenge.")

    return recs
