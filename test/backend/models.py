import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class EndToEndSession(Base):
    __tablename__ = "end_to_end_sessions"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, nullable=False)
    user_id = Column(String, default="anonymous")
    reality_mode = Column(Boolean, default=False)
    current_stage = Column(Integer, default=1)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    overall_score = Column(Float, nullable=True)
    status = Column(String, default="in_progress")

    stages = relationship("StageResult", back_populates="session", cascade="all, delete-orphan")
    scorecard = relationship("Scorecard", back_populates="session", uselist=False, cascade="all, delete-orphan")


class StageResult(Base):
    __tablename__ = "stage_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("end_to_end_sessions.id"), nullable=False)
    stage_number = Column(Integer, nullable=False)
    stage_name = Column(String, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user_choices = Column(Text, default="{}")
    computed_result = Column(Text, default="{}")
    score = Column(Float, default=0.0)
    max_score = Column(Float, default=100.0)
    cascade_effects = Column(Text, default="[]")
    feedback = Column(Text, default="")

    session = relationship("EndToEndSession", back_populates="stages")

    @property
    def choices_dict(self):
        return json.loads(self.user_choices) if self.user_choices else {}

    @property
    def result_dict(self):
        return json.loads(self.computed_result) if self.computed_result else {}

    @property
    def cascade_list(self):
        return json.loads(self.cascade_effects) if self.cascade_effects else []


class Scorecard(Base):
    __tablename__ = "scorecards"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("end_to_end_sessions.id"), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    overall_score = Column(Float, default=0.0)
    labeling_score = Column(Float, default=0.0)
    detection_score = Column(Float, default=0.0)
    policy_effectiveness = Column(Float, default=0.0)
    decision_quality = Column(Float, default=0.0)
    fp_impact = Column(Float, default=0.0)
    insider_risk_score = Column(Float, default=0.0)
    compliance_score = Column(Float, default=0.0)

    recommendations = Column(Text, default="[]")
    cascade_summary = Column(Text, default="[]")
    detail_breakdown = Column(Text, default="{}")

    session = relationship("EndToEndSession", back_populates="scorecard")


class PolicyRecord(Base):
    __tablename__ = "policy_records"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    conditions = Column(Text, default="[]")
    actions = Column(Text, default="[]")
    logic_operator = Column(String, default="AND")
    created_at = Column(DateTime, default=datetime.utcnow)
    session_id = Column(Integer, ForeignKey("end_to_end_sessions.id"), nullable=True)


class IncidentRecord(Base):
    __tablename__ = "incident_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("end_to_end_sessions.id"), nullable=True)
    severity = Column(String, default="Medium")
    status = Column(String, default="New")
    source = Column(String, default="")
    description = Column(Text, default="")
    analyst_action = Column(String, nullable=True)
    justification = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class WhatIfSnapshot(Base):
    __tablename__ = "what_if_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("end_to_end_sessions.id"), nullable=False)
    stage_number = Column(Integer, nullable=False)
    original_choices = Column(Text, default="{}")
    alternative_choices = Column(Text, default="{}")
    original_outcome = Column(Text, default="{}")
    alternative_outcome = Column(Text, default="{}")
    delta_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
