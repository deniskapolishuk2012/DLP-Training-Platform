from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from database import get_db
from models import EndToEndSession, StageResult, Scorecard, WhatIfSnapshot
from schemas import (
    StartEndToEndRequest, StartEndToEndResponse,
    SubmitStageRequest, SubmitStageResponse,
    WhatIfRequest, WhatIfResponse,
    ScorecardResponse,
)
from engine.simulation_engine import (
    get_scenario, build_stage_data, evaluate_stage, compute_what_if,
)
from engine.scoring import compute_scorecard

router = APIRouter(prefix="/api", tags=["end-to-end"])


def _stage_to_dict(s):
    return {
        "stage_number": s.stage_number,
        "user_choices": s.user_choices,
        "computed_result": s.computed_result,
        "cascade_effects": s.cascade_effects,
        "score": s.score,
        "max_score": s.max_score,
    }


@router.post("/start_end_to_end", response_model=StartEndToEndResponse)
def start_simulation(req: StartEndToEndRequest, db: Session = Depends(get_db)):
    scenario = get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    session = EndToEndSession(
        scenario_id=req.scenario_id,
        user_id=req.user_id,
        reality_mode=req.reality_mode,
        current_stage=1,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    stage_1_data = build_stage_data(req.scenario_id, 1, [], req.reality_mode)

    return StartEndToEndResponse(
        session_id=session.id,
        scenario_id=req.scenario_id,
        scenario_title=scenario["title"],
        scenario_description=scenario["description"],
        total_stages=7,
        reality_mode=req.reality_mode,
        stage_1_data=stage_1_data,
    )


@router.post("/submit_stage/{stage_number}", response_model=SubmitStageResponse)
def submit_stage(stage_number: int, req: SubmitStageRequest, db: Session = Depends(get_db)):
    session = db.query(EndToEndSession).filter(EndToEndSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if stage_number != req.stage_number:
        raise HTTPException(status_code=400, detail="Stage number mismatch")
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    previous = (
        db.query(StageResult)
        .filter(StageResult.session_id == session.id)
        .order_by(StageResult.stage_number)
        .all()
    )
    prev_dicts = [_stage_to_dict(s) for s in previous]

    stage_names = {
        1: "Data Creation", 2: "Label Assignment", 3: "SIT Detection",
        4: "Policy Evaluation", 5: "Incident Creation",
        6: "Analyst Decision", 7: "Compliance & Business Impact",
    }

    evaluation = evaluate_stage(session.scenario_id, stage_number, req.choices, prev_dicts)

    stage_result = StageResult(
        session_id=session.id,
        stage_number=stage_number,
        stage_name=stage_names.get(stage_number, "Stage %d" % stage_number),
        user_choices=json.dumps(req.choices),
        computed_result=json.dumps(evaluation.get("computed_result", {})),
        score=evaluation.get("score", 0),
        max_score=evaluation.get("max_score", 100),
        cascade_effects=json.dumps(evaluation.get("cascade_effects", [])),
        feedback=evaluation.get("feedback", ""),
    )
    db.add(stage_result)

    is_final = stage_number >= 7
    next_stage_data = None

    if is_final:
        session.status = "completed"
        from datetime import datetime
        session.completed_at = datetime.utcnow()

        current_dict = {
            "stage_number": stage_number,
            "user_choices": json.dumps(req.choices),
            "computed_result": json.dumps(evaluation.get("computed_result", {})),
            "cascade_effects": json.dumps(evaluation.get("cascade_effects", [])),
            "score": evaluation.get("score", 0),
            "max_score": evaluation.get("max_score", 100),
        }
        all_results = prev_dicts + [current_dict]

        sc = compute_scorecard({"scenario_id": session.scenario_id}, all_results)

        scorecard = Scorecard(
            session_id=session.id,
            overall_score=sc["overall_score"],
            labeling_score=sc["labeling_score"],
            detection_score=sc["detection_score"],
            policy_effectiveness=sc["policy_effectiveness"],
            decision_quality=sc["decision_quality"],
            fp_impact=sc["fp_impact"],
            insider_risk_score=sc["insider_risk_score"],
            compliance_score=sc["compliance_score"],
            recommendations=json.dumps(sc["recommendations"]),
            cascade_summary=json.dumps(sc["cascade_summary"]),
            detail_breakdown=json.dumps(sc["detail_breakdown"]),
        )
        db.add(scorecard)
        session.overall_score = sc["overall_score"]
    else:
        session.current_stage = stage_number + 1
        current_dict = {
            "stage_number": stage_number,
            "user_choices": json.dumps(req.choices),
            "computed_result": json.dumps(evaluation.get("computed_result", {})),
            "cascade_effects": json.dumps(evaluation.get("cascade_effects", [])),
            "score": evaluation.get("score", 0),
            "max_score": evaluation.get("max_score", 100),
        }
        updated_prev = prev_dicts + [current_dict]
        next_stage_data = build_stage_data(
            session.scenario_id, stage_number + 1, updated_prev, session.reality_mode
        )

    db.commit()

    return SubmitStageResponse(
        session_id=session.id,
        stage_number=stage_number,
        score=evaluation.get("score", 0),
        max_score=evaluation.get("max_score", 100),
        feedback=evaluation.get("feedback", ""),
        computed_result=evaluation.get("computed_result", {}),
        cascade_effects=evaluation.get("cascade_effects", []),
        next_stage_data=next_stage_data,
        is_final=is_final,
    )


@router.get("/end_to_end_result/{session_id}")
def get_result(session_id: int, db: Session = Depends(get_db)):
    session = db.query(EndToEndSession).filter(EndToEndSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    scorecard = db.query(Scorecard).filter(Scorecard.session_id == session_id).first()
    stages = (
        db.query(StageResult)
        .filter(StageResult.session_id == session_id)
        .order_by(StageResult.stage_number)
        .all()
    )

    return {
        "session_id": session.id,
        "scenario_id": session.scenario_id,
        "status": session.status,
        "reality_mode": session.reality_mode,
        "started_at": str(session.started_at),
        "completed_at": str(session.completed_at) if session.completed_at else None,
        "stages": [
            {
                "stage_number": s.stage_number,
                "stage_name": s.stage_name,
                "score": s.score,
                "max_score": s.max_score,
                "feedback": s.feedback,
                "user_choices": json.loads(s.user_choices) if s.user_choices else {},
                "computed_result": json.loads(s.computed_result) if s.computed_result else {},
                "cascade_effects": json.loads(s.cascade_effects) if s.cascade_effects else [],
            }
            for s in stages
        ],
        "scorecard": {
            "overall_score": scorecard.overall_score,
            "labeling_score": scorecard.labeling_score,
            "detection_score": scorecard.detection_score,
            "policy_effectiveness": scorecard.policy_effectiveness,
            "decision_quality": scorecard.decision_quality,
            "fp_impact": scorecard.fp_impact,
            "insider_risk_score": scorecard.insider_risk_score,
            "compliance_score": scorecard.compliance_score,
            "recommendations": json.loads(scorecard.recommendations),
            "cascade_summary": json.loads(scorecard.cascade_summary),
            "detail_breakdown": json.loads(scorecard.detail_breakdown),
        } if scorecard else None,
    }


@router.post("/what_if_stage")
def what_if_stage(req: WhatIfRequest, db: Session = Depends(get_db)):
    session = db.query(EndToEndSession).filter(EndToEndSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    stage_result = (
        db.query(StageResult)
        .filter(StageResult.session_id == req.session_id, StageResult.stage_number == req.stage_number)
        .first()
    )
    if not stage_result:
        raise HTTPException(status_code=404, detail="Stage result not found")

    previous = (
        db.query(StageResult)
        .filter(StageResult.session_id == req.session_id, StageResult.stage_number < req.stage_number)
        .order_by(StageResult.stage_number)
        .all()
    )
    prev_dicts = [_stage_to_dict(s) for s in previous]

    original_choices = json.loads(stage_result.user_choices) if stage_result.user_choices else {}

    result = compute_what_if(
        session.scenario_id, req.stage_number,
        original_choices, req.alternative_choices, prev_dicts
    )

    snapshot = WhatIfSnapshot(
        session_id=req.session_id,
        stage_number=req.stage_number,
        original_choices=json.dumps(original_choices),
        alternative_choices=json.dumps(req.alternative_choices),
        original_outcome=json.dumps(result["original_outcome"]),
        alternative_outcome=json.dumps(result["alternative_outcome"]),
        delta_summary=result["delta_summary"],
    )
    db.add(snapshot)
    db.commit()

    return result


@router.get("/scenarios")
def list_scenarios():
    from data.scenarios import SCENARIOS
    return [
        {
            "id": s["id"],
            "title": s["title"],
            "description": s["description"],
            "difficulty": s["difficulty"],
            "regulations": s["regulations"],
        }
        for s in SCENARIOS.values()
    ]
