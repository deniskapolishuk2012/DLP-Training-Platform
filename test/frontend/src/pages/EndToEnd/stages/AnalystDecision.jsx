import { useState, useEffect } from 'react';

const ANALYST_ACTIONS = [
  { id: 'true_positive_block', label: 'Confirm & Block — True Positive', desc: 'Block the content and confirm this is a real DLP violation.' },
  { id: 'true_positive_escalate', label: 'Confirm & Escalate to Legal', desc: 'Escalate to legal team for potential regulatory action.' },
  { id: 'true_positive_remediate', label: 'Confirm & Remediate', desc: 'Confirm and initiate data remediation procedures.' },
  { id: 'false_positive_dismiss', label: 'Dismiss — False Positive', desc: 'Mark as false positive and dismiss the incident.' },
  { id: 'false_positive_tune', label: 'Dismiss & Tune Policy', desc: 'Dismiss as FP and adjust the policy to prevent future FPs.' },
  { id: 'needs_investigation', label: 'Needs Further Investigation', desc: 'Requires additional analysis before a decision can be made.' },
  { id: 'insider_risk_referral', label: 'Refer to Insider Risk Team', desc: 'Behavioral signals warrant insider risk investigation.' },
];

export default function AnalystDecision({ data, onSubmit, onWhatIf, loading, realityMode }) {
  const [action, setAction] = useState('');
  const [justification, setJustification] = useState('');
  const [showFPAnalysis, setShowFPAnalysis] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleSubmit = () => {
    onSubmit(6, { analyst_action: action, justification });
  };

  const handleWhatIf = async () => {
    const altAction = action === 'true_positive_block' ? 'false_positive_dismiss' : 'true_positive_block';
    const res = await onWhatIf(6, { analyst_action: altAction, justification: 'What-if alternative' });
    setWhatIfResult(res);
    setShowWhatIf(true);
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 6: {data.title}</h2>
        <div className="flex gap-8">
          <button className="btn btn-outline btn-sm" onClick={() => setShowFPAnalysis(!showFPAnalysis)}>
            {showFPAnalysis ? 'Hide' : 'Show'} FP Analysis
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleWhatIf} disabled={!action}>
            What-If
          </button>
          {timeLeft !== null && (
            <div className={`timer${timeLeft < 30 ? '' : ' warning'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-muted mb-16">{data.description}</p>

      {data.cascade_warnings?.map((w, i) => (
        <div key={i} className="cascade-warning">{w}</div>
      ))}

      <div className="grid-2 mt-16">
        <div>
          <div className="card mb-16">
            <div className="card-header"><h3>Make Your Decision</h3></div>

            <div className="flex-between mb-16">
              <span className="text-sm">Incident Severity:</span>
              <span className={`badge badge-${data.incident_severity === 'High' ? 'danger' : data.incident_severity === 'Medium' ? 'warning' : 'info'}`}>
                {data.incident_severity}
              </span>
            </div>

            <div className="radio-group">
              {ANALYST_ACTIONS.map(a => (
                <div key={a.id} className={`radio-option${action === a.id ? ' selected' : ''}`} onClick={() => setAction(a.id)}>
                  <input type="radio" checked={action === a.id} onChange={() => setAction(a.id)} />
                  <div>
                    <strong className="text-sm">{a.label}</strong>
                    <p className="text-sm text-muted">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group mt-16">
              <label>Justification (Required)</label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Explain your reasoning. Consider: data sensitivity, insider risk signals, regulatory implications, and business impact..."
                rows={5}
              />
              <p className="hint">Detailed justifications score higher. Reference specific evidence from the incident.</p>
            </div>

            <button
              className="btn btn-primary btn-lg mt-16"
              onClick={handleSubmit}
              disabled={!action || loading || (timeLeft !== null && timeLeft <= 0)}
              style={{ width: '100%' }}
            >
              {loading ? 'Submitting...' : 'Submit & Continue to Compliance Impact →'}
            </button>
          </div>
        </div>

        <div>
          {/* Insider Risk Panel */}
          <div className="card mb-16">
            <div className="card-header">
              <h3>Insider Risk Assessment</h3>
              <span className={`badge ${data.cumulative_risk_score > data.risk_threshold ? 'badge-danger' : 'badge-warning'}`}>
                Score: {data.cumulative_risk_score}/{data.risk_threshold}
              </span>
            </div>

            {data.behavioral_analysis && (
              <div className="mb-16">
                <table className="data-table">
                  <tbody>
                    <tr><td className="font-semibold">Pattern</td><td>{data.behavioral_analysis.pattern}</td></tr>
                    <tr><td className="font-semibold">Trend</td><td><span className="text-danger">{data.behavioral_analysis.risk_trend}</span></td></tr>
                    <tr><td className="font-semibold">Anomaly Score</td><td>{(data.behavioral_analysis.anomaly_score * 100).toFixed(0)}%</td></tr>
                    <tr><td className="font-semibold">Peer Comparison</td><td>{data.behavioral_analysis.peer_comparison}</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="timeline">
              {(data.insider_risk_timeline || []).map((event, i) => (
                <div key={i} className={`timeline-item ${event.risk_delta >= 20 ? 'risk-high' : event.risk_delta >= 10 ? 'risk-medium' : ''}`}>
                  <div className="timeline-time">{new Date(event.timestamp).toLocaleString()}</div>
                  <div className="timeline-content">{event.action}</div>
                  <div className="timeline-delta">+{event.risk_delta} risk</div>
                </div>
              ))}
            </div>
          </div>

          {/* FP Analysis Panel */}
          {showFPAnalysis && data.fp_analysis && (
            <div className="card mb-16">
              <div className="card-header"><h3>False Positive Analysis</h3></div>
              <div className="grid-2 mb-16">
                <div className="card metric-card">
                  <div className="metric-value" style={{ color: '#0078d4' }}>{(data.fp_analysis.similar_incidents_fp_rate * 100).toFixed(0)}%</div>
                  <div className="metric-label">Historical FP Rate</div>
                </div>
                <div className="card metric-card">
                  <div className="metric-value" style={{ color: '#107c10' }}>{(data.fp_analysis.model_confidence * 100).toFixed(0)}%</div>
                  <div className="metric-label">Model Confidence</div>
                </div>
              </div>
              <div className="what-if-panel">
                <h4>AI Optimization Suggestions</h4>
                <ul style={{ paddingLeft: 20, fontSize: 13 }}>
                  {data.fp_analysis.suggested_optimizations.map((s, i) => <li key={i} className="mb-8">{s}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* What-If Panel */}
          {showWhatIf && whatIfResult && !whatIfResult.error && (
            <div className="card">
              <div className="card-header"><h3>What-If Analysis</h3></div>
              <p className="text-sm mb-8">{whatIfResult.delta_summary}</p>
              <div className="grid-2">
                <div className="card metric-card">
                  <div className="metric-value">{whatIfResult.original_outcome?.score}</div>
                  <div className="metric-label">Your Choice</div>
                </div>
                <div className="card metric-card">
                  <div className="metric-value">{whatIfResult.alternative_outcome?.score}</div>
                  <div className="metric-label">Alternative</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
