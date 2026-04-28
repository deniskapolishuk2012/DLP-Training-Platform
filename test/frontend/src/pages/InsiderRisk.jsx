import { useState } from 'react';
import { api } from '../api/client';

const SCENARIOS = [
  { id: 'financial_leak', title: 'Finance Analyst — External Email', desc: 'Sarah Chen, Senior Financial Analyst' },
  { id: 'healthcare_breach', title: 'Clinical Researcher — Teams Share', desc: 'Dr. James Miller, Research Lead' },
  { id: 'ip_theft_simple', title: 'Developer — Public GitHub Push', desc: 'Alex Rivera, Senior Developer' },
];

export default function InsiderRisk() {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!scenario) return;
    try {
      const res = await api.analyzeInsiderRisk({ scenario_id: scenario });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  const getRiskColor = (level) => {
    if (level === 'Critical') return 'var(--danger)';
    if (level === 'High') return 'var(--warning)';
    if (level === 'Medium') return '#0078d4';
    return 'var(--success)';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Insider Risk</h1>
        <p>Analyze behavioral timelines and cumulative risk scores for potential insider threats.</p>
      </div>

      <div className="grid-3 mb-24">
        {SCENARIOS.map(s => (
          <div key={s.id} className={`card scenario-card${scenario === s.id ? ' selected' : ''}`}
            onClick={() => { setScenario(s.id); setResult(null); }}>
            <h3 style={{ fontSize: 14 }}>{s.title}</h3>
            <p className="text-sm text-muted mt-8">{s.desc}</p>
          </div>
        ))}
      </div>

      {scenario && (
        <div className="flex-between mb-16">
          <div />
          <button className="btn btn-primary" onClick={handleAnalyze}>Analyze Risk</button>
        </div>
      )}

      {result && !result.error && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Risk Summary</h3></div>
            <div className="grid-3 mb-16">
              <div className="card metric-card">
                <div className="metric-value" style={{ color: getRiskColor(result.risk_level) }}>{result.final_risk_score}</div>
                <div className="metric-label">Cumulative Risk Score</div>
              </div>
              <div className="card metric-card">
                <div className="metric-value" style={{ color: getRiskColor(result.risk_level) }}>{result.risk_level}</div>
                <div className="metric-label">Risk Level</div>
              </div>
              <div className="card metric-card">
                <div className="metric-value">{result.threshold}</div>
                <div className="metric-label">Alert Threshold</div>
              </div>
            </div>

            {result.exceeded_threshold ? (
              <div className="alert alert-danger">
                Risk score ({result.final_risk_score}) exceeds threshold ({result.threshold}). <strong>{result.recommendation}</strong>
              </div>
            ) : (
              <div className="alert alert-info">
                Risk score ({result.final_risk_score}) is below threshold ({result.threshold}). {result.recommendation}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>Behavioral Timeline</h3></div>
            <div className="timeline">
              {result.timeline.map((event, i) => {
                const riskClass = event.risk_delta >= 20 ? 'risk-high' : event.risk_delta >= 10 ? 'risk-medium' : '';
                return (
                  <div key={i} className={`timeline-item ${riskClass}`}>
                    <div className="timeline-time">{new Date(event.timestamp).toLocaleString()}</div>
                    <div className="timeline-content">{event.action}</div>
                    <div className="timeline-delta">+{event.risk_delta} risk → cumulative: {event.cumulative_score}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
