import { useState, useCallback } from 'react';
import { api } from '../../api/client';
import { SimulationProvider, useSimulation } from '../../context/SimulationContext';
import ProgressBar from '../../components/ProgressBar';
import DataCreation from './stages/DataCreation';
import LabelAssignment from './stages/LabelAssignment';
import SITDetection from './stages/SITDetection';
import PolicyEvaluation from './stages/PolicyEvaluation';
import IncidentCreation from './stages/IncidentCreation';
import AnalystDecision from './stages/AnalystDecision';
import ComplianceImpact from './stages/ComplianceImpact';
import Scorecard from './Scorecard';

const SCENARIOS = [
  { id: 'financial_leak', title: 'Financial Data Leak via Email', difficulty: 'Advanced', desc: 'Employee emails unannounced earnings to external consultant.' },
  { id: 'healthcare_breach', title: 'Patient Records Shared on Teams', difficulty: 'Advanced', desc: 'Researcher shares PHI dataset in broad Teams channel.' },
  { id: 'ip_theft_simple', title: 'Source Code Upload to Public Repo', difficulty: 'Intermediate', desc: 'Developer pushes proprietary code with API keys to public GitHub.' },
];

function SimulationInner() {
  const { state, dispatch } = useSimulation();
  const [selectedScenario, setSelectedScenario] = useState('');
  const [realityMode, setRealityMode] = useState(false);

  const handleStart = async () => {
    if (!selectedScenario) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.startEndToEnd({
        scenario_id: selectedScenario,
        reality_mode: realityMode,
      });
      dispatch({ type: 'START_SESSION', payload: res });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  };

  const handleSubmitStage = useCallback(async (stageNumber, choices) => {
    dispatch({ type: 'SUBMIT_STAGE' });
    try {
      const res = await api.submitStage(stageNumber, {
        session_id: state.sessionId,
        stage_number: stageNumber,
        choices,
      });
      dispatch({ type: 'STAGE_RESULT', payload: res });

      if (res.is_final) {
        try {
          const scorecard = await api.getResult(state.sessionId);
          dispatch({ type: 'SET_SCORECARD', payload: scorecard.scorecard });
        } catch { /* scorecard fetch failed, non-critical */ }
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  }, [state.sessionId, dispatch]);

  const handleWhatIf = useCallback(async (stageNumber, alternativeChoices) => {
    try {
      return await api.whatIfStage({
        session_id: state.sessionId,
        stage_number: stageNumber,
        alternative_choices: alternativeChoices,
      });
    } catch (e) {
      return { error: e.message };
    }
  }, [state.sessionId]);

  const handleReset = () => dispatch({ type: 'RESET' });

  const renderStage = () => {
    if (!state.stageData) return null;
    const props = {
      data: state.stageData,
      onSubmit: handleSubmitStage,
      onWhatIf: handleWhatIf,
      loading: state.loading,
      realityMode: state.realityMode,
      stageResults: state.stageResults,
    };

    switch (state.currentStage) {
      case 1: return <DataCreation {...props} />;
      case 2: return <LabelAssignment {...props} />;
      case 3: return <SITDetection {...props} />;
      case 4: return <PolicyEvaluation {...props} />;
      case 5: return <IncidentCreation {...props} />;
      case 6: return <AnalystDecision {...props} />;
      case 7: return <ComplianceImpact {...props} />;
      default: return null;
    }
  };

  // Idle state — scenario selection
  if (state.status === 'idle') {
    return (
      <div>
        <div className="page-header">
          <h1>End-to-End DLP Simulation</h1>
          <p>The capstone module — experience the complete DLP lifecycle from data creation to compliance impact. Every decision cascades forward.</p>
        </div>

        <div className="alert alert-info mb-24">
          This simulation flows through 7 stages: <strong>Data Creation → Labeling → SIT Detection → Policy Evaluation → Incident → Analyst Decision → Compliance Impact</strong>.
          Each stage depends on your previous choices — early mistakes cascade into bigger incidents.
        </div>

        <h2 className="mb-16" style={{ fontSize: 16 }}>Select Scenario</h2>
        <div className="grid-3 mb-24">
          {SCENARIOS.map(s => (
            <div key={s.id}
              className={`card scenario-card${selectedScenario === s.id ? ' selected' : ''}`}
              onClick={() => setSelectedScenario(s.id)}
            >
              <div className="flex-between mb-8">
                <span className={`badge badge-${s.difficulty === 'Advanced' ? 'danger' : 'warning'}`}>{s.difficulty}</span>
              </div>
              <h3 style={{ fontSize: 15 }}>{s.title}</h3>
              <p className="text-sm text-muted mt-8">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 500 }}>
          <div className="flex-between">
            <div>
              <label className="font-semibold">Reality Mode</label>
              <p className="text-sm text-muted">Redacted content, time pressure, no hints</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={realityMode} onChange={e => setRealityMode(e.target.checked)} />
              <span className="text-sm font-semibold">{realityMode ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        </div>

        <button className="btn btn-primary btn-lg mt-24" onClick={handleStart} disabled={!selectedScenario}>
          Start Simulation
        </button>

        {state.error && <div className="alert alert-danger mt-16">{state.error}</div>}
      </div>
    );
  }

  // Completed — show scorecard
  if (state.status === 'completed') {
    return (
      <div>
        <div className="page-header">
          <div className="flex-between">
            <div>
              <h1>Simulation Complete</h1>
              <p>{state.scenarioTitle}</p>
            </div>
            <button className="btn btn-outline" onClick={handleReset}>New Simulation</button>
          </div>
        </div>
        <ProgressBar currentStage={8} totalStages={7} stageResults={state.stageResults} />
        <Scorecard scorecard={state.scorecard} stageResults={state.stageResults} />
      </div>
    );
  }

  // Active — show current stage
  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>{state.scenarioTitle}</h1>
            <p>{state.scenarioDescription}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleReset}>Exit</button>
        </div>
      </div>

      {state.realityMode && (
        <div className="reality-banner">
          REALITY MODE ACTIVE — Redacted content, time pressure, no hints
        </div>
      )}

      <ProgressBar
        currentStage={state.currentStage}
        totalStages={state.totalStages}
        stageResults={state.stageResults}
      />

      {state.error && <div className="alert alert-danger mb-16">{state.error}</div>}

      {/* Show feedback from previous stage */}
      {state.stageResults.length > 0 && state.stageResults[state.stageResults.length - 1].stageNumber === state.currentStage - 1 && (
        <div className={`alert ${state.stageResults[state.stageResults.length - 1].score >= 70 ? 'alert-success' : state.stageResults[state.stageResults.length - 1].score >= 40 ? 'alert-warning' : 'alert-danger'} mb-16`}>
          <div className="flex-between">
            <strong>Stage {state.stageResults[state.stageResults.length - 1].stageNumber} Result</strong>
            <span className="badge badge-neutral">
              {state.stageResults[state.stageResults.length - 1].score}/{state.stageResults[state.stageResults.length - 1].maxScore}
            </span>
          </div>
          <p className="text-sm mt-8">{state.stageResults[state.stageResults.length - 1].feedback}</p>
          {state.stageResults[state.stageResults.length - 1].cascadeEffects?.length > 0 && (
            <div className="mt-8">
              {state.stageResults[state.stageResults.length - 1].cascadeEffects.map((c, i) => (
                <div key={i} className="cascade-warning">{c}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {renderStage()}
    </div>
  );
}

export default function EndToEndSimulation() {
  return (
    <SimulationProvider>
      <SimulationInner />
    </SimulationProvider>
  );
}
