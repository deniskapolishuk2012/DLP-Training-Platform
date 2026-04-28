"""
Advanced Policy Evaluation Engine.
Supports AND/OR grouped conditions, rich condition types,
actions with Warn+Override, simulation on multiple scenarios,
TP/FP/FN/TN metrics, Precision/Recall/F1, and explainability.
"""
from __future__ import annotations


def evaluate_condition(condition: dict, context: dict) -> tuple[bool, str]:
    """Evaluate a single condition against a context. Returns (match, explanation)."""
    ctype = condition.get("type", "")
    operator = condition.get("operator", "")
    value = condition.get("value", "")

    if ctype == "sensitivity_label":
        actual = context.get("label", "")
        if operator == "equals":
            matched = actual == value
            return matched, f"Label '{actual}' {'==' if matched else '!='} '{value}'"
        if operator == "in":
            values = [v.strip() for v in value.split(",")]
            matched = actual in values
            return matched, f"Label '{actual}' {'in' if matched else 'not in'} {values}"
        if operator == "not_equals":
            matched = actual != value
            return matched, f"Label '{actual}' {'!=' if matched else '=='} '{value}'"

    elif ctype == "content_contains_sit":
        detected_sits = context.get("detected_sits", [])
        detected_names = [s if isinstance(s, str) else s.get("type", "") for s in detected_sits]
        target_sits = [v.strip() for v in value.split(",")]
        if operator == "contains_any":
            found = [s for s in target_sits if s in detected_names]
            matched = len(found) > 0
            return matched, f"SITs found: {found}" if matched else f"No target SITs detected (looking for: {target_sits})"
        if operator == "contains_all":
            missing = [s for s in target_sits if s not in detected_names]
            matched = len(missing) == 0
            return matched, f"All target SITs present" if matched else f"Missing SITs: {missing}"
        if operator == "count_greater_than":
            total = sum(
                (s.get("count", 1) if isinstance(s, dict) else 1)
                for s in detected_sits if (s if isinstance(s, str) else s.get("type", "")) in target_sits
            )
            threshold = int(value.split(":")[-1]) if ":" in value else 1
            matched = total > threshold
            return matched, f"SIT match count {total} {'>' if matched else '<='} {threshold}"

    elif ctype == "recipient_domain" or ctype == "destination":
        channel = context.get("channel", "")
        if operator == "is_external":
            matched = "external" in channel.lower() or "public" in channel.lower()
            return matched, f"Channel '{channel}' is {'external' if matched else 'internal'}"
        if operator == "is_internal":
            matched = "external" not in channel.lower() and "public" not in channel.lower()
            return matched, f"Channel '{channel}' is {'internal' if matched else 'external'}"

    elif ctype == "sharing_scope":
        scope = context.get("sharing_scope", 0)
        try:
            threshold = int(value)
        except ValueError:
            threshold = 10
        if operator == "greater_than":
            matched = scope > threshold
            return matched, f"Sharing scope {scope} {'>' if matched else '<='} {threshold}"

    elif ctype == "file_type":
        ftype = context.get("file_type", "")
        if operator == "equals":
            matched = ftype.lower() == value.lower()
            return matched, f"File type '{ftype}' {'==' if matched else '!='} '{value}'"
        if operator == "in":
            values = [v.strip().lower() for v in value.split(",")]
            matched = ftype.lower() in values
            return matched, f"File type '{ftype}' {'in' if matched else 'not in'} {values}"

    elif ctype == "file_size":
        fsize = context.get("file_size_mb", 0)
        try:
            threshold = float(value)
        except ValueError:
            threshold = 0
        if operator == "greater_than":
            matched = fsize > threshold
            return matched, f"File size {fsize}MB {'>' if matched else '<='} {threshold}MB"

    return False, f"Unknown condition type: {ctype}"


def evaluate_condition_group(group: dict, context: dict) -> tuple[bool, list[dict]]:
    """Evaluate a group of conditions with AND/OR logic."""
    logic = group.get("logic", "AND").upper()
    conditions = group.get("conditions", [])
    results = []

    for cond in conditions:
        matched, explanation = evaluate_condition(cond, context)
        results.append({"condition": cond, "matched": matched, "explanation": explanation})

    if logic == "AND":
        group_matched = all(r["matched"] for r in results)
    else:
        group_matched = any(r["matched"] for r in results)

    return group_matched, results


def evaluate_policy(policy: dict, context: dict) -> dict:
    """
    Evaluate a full policy against a context.
    Returns match result, triggered actions, and full explainability trace.
    """
    condition_groups = policy.get("condition_groups", [])
    group_logic = policy.get("group_logic", "AND").upper()
    actions = policy.get("actions", [])

    group_results = []
    for i, group in enumerate(condition_groups):
        matched, cond_results = evaluate_condition_group(group, context)
        group_results.append({
            "group_index": i,
            "logic": group.get("logic", "AND"),
            "matched": matched,
            "condition_results": cond_results,
        })

    if group_logic == "AND":
        policy_matched = all(g["matched"] for g in group_results)
    else:
        policy_matched = any(g["matched"] for g in group_results)

    triggered_actions = actions if policy_matched else []

    return {
        "policy_name": policy.get("name", "Unnamed Policy"),
        "matched": policy_matched,
        "group_logic": group_logic,
        "group_results": group_results,
        "triggered_actions": triggered_actions,
        "explanation": _build_explanation(policy, group_results, policy_matched),
    }


def _build_explanation(policy: dict, group_results: list, matched: bool) -> str:
    logic = policy.get("group_logic", "AND")
    parts = []
    for gr in group_results:
        cond_parts = []
        for cr in gr["condition_results"]:
            status = "PASS" if cr["matched"] else "FAIL"
            cond_parts.append(f"  [{status}] {cr['explanation']}")
        group_status = "MATCH" if gr["matched"] else "NO MATCH"
        parts.append(f"Group {gr['group_index']+1} ({gr['logic']}) → {group_status}\n" + "\n".join(cond_parts))

    overall = "POLICY TRIGGERED" if matched else "POLICY NOT TRIGGERED"
    return f"{overall} (groups joined by {logic})\n\n" + "\n\n".join(parts)


def simulate_policy_on_scenarios(policy: dict, scenarios: list[dict]) -> dict:
    """
    Run policy against multiple labeled scenarios.
    Computes TP/FP/FN/TN, Precision, Recall, F1.
    """
    results = []
    tp = fp = fn = tn = 0

    for scenario in scenarios:
        context = scenario.get("context", scenario)
        expected = scenario.get("should_match", None)
        result = evaluate_policy(policy, context)
        result["scenario_id"] = scenario.get("id", "unknown")
        result["expected"] = expected

        if expected is not None:
            if result["matched"] and expected:
                result["classification"] = "TP"
                tp += 1
            elif result["matched"] and not expected:
                result["classification"] = "FP"
                fp += 1
            elif not result["matched"] and expected:
                result["classification"] = "FN"
                fn += 1
            else:
                result["classification"] = "TN"
                tn += 1

        results.append(result)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    metrics = {
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "total_scenarios": len(scenarios),
        "accuracy": round((tp + tn) / len(scenarios), 4) if scenarios else 0,
    }

    explainability = [
        {
            "scenario_id": r["scenario_id"],
            "matched": r["matched"],
            "classification": r.get("classification", "N/A"),
            "explanation": r["explanation"],
        }
        for r in results
    ]

    return {"results": results, "metrics": metrics, "explainability": explainability}


def what_if_policy(original_policy: dict, modified_policy: dict, context: dict) -> dict:
    """Compare original vs modified policy on the same context."""
    original_result = evaluate_policy(original_policy, context)
    modified_result = evaluate_policy(modified_policy, context)

    changes = []
    if original_result["matched"] != modified_result["matched"]:
        changes.append(
            f"Policy outcome changed: {'TRIGGERED' if original_result['matched'] else 'NOT TRIGGERED'}"
            f" → {'TRIGGERED' if modified_result['matched'] else 'NOT TRIGGERED'}"
        )

    orig_actions = set(str(a) for a in original_result["triggered_actions"])
    mod_actions = set(str(a) for a in modified_result["triggered_actions"])
    if orig_actions != mod_actions:
        changes.append(f"Actions changed: {orig_actions} → {mod_actions}")

    return {
        "original": original_result,
        "modified": modified_result,
        "changes": changes,
        "outcome_changed": original_result["matched"] != modified_result["matched"],
    }
