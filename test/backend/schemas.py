from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class StartEndToEndRequest(BaseModel):
    scenario_id: str
    user_id: str = "anonymous"
    reality_mode: bool = False


class StartEndToEndResponse(BaseModel):
    session_id: int
    scenario_id: str
    scenario_title: str
    scenario_description: str
    total_stages: int
    reality_mode: bool
    stage_1_data: dict


class SubmitStageRequest(BaseModel):
    session_id: int
    stage_number: int
    choices: dict


class SubmitStageResponse(BaseModel):
    session_id: int
    stage_number: int
    score: float
    max_score: float
    feedback: str
    computed_result: dict
    cascade_effects: list
    next_stage_data: Optional[dict] = None
    is_final: bool


class WhatIfRequest(BaseModel):
    session_id: int
    stage_number: int
    alternative_choices: dict


class WhatIfResponse(BaseModel):
    original_outcome: dict
    alternative_outcome: dict
    delta_summary: str
    impact_analysis: dict


class ScorecardResponse(BaseModel):
    session_id: int
    overall_score: float
    labeling_score: float
    detection_score: float
    policy_effectiveness: float
    decision_quality: float
    fp_impact: float
    insider_risk_score: float
    compliance_score: float
    recommendations: list
    cascade_summary: list
    detail_breakdown: dict
    completed_at: Optional[str] = None


class PolicyCondition(BaseModel):
    type: str
    operator: str
    value: str


class PolicyConditionGroup(BaseModel):
    logic: str = "AND"
    conditions: List[PolicyCondition]


class PolicyRule(BaseModel):
    name: str
    description: str = ""
    condition_groups: List[PolicyConditionGroup]
    group_logic: str = "AND"
    actions: List[dict]


class PolicySimRequest(BaseModel):
    policy: PolicyRule
    test_scenarios: List[dict] = []


class PolicySimResponse(BaseModel):
    results: List[dict]
    metrics: dict
    explainability: List[dict]
