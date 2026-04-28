import { useState, useEffect } from 'react';

export default function IncidentCreation({ data, onSubmit, loading, realityMode }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('');
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleSubmit = () => {
    onSubmit(5, { acknowledged, investigation_notes: notes, assigned_priority: priority });
  };

  const inc = data.incident || {};

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 5: {data.title}</h2>
        {timeLeft !== null && (
          <div className={`timer${timeLeft < 30 ? '' : ' warning'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      <p className="text-sm text-muted mb-16">{data.description}</p>

      {data.cascade_warnings?.map((w, i) => (
        <div key={i} className="cascade-warning">{w}</div>
      ))}

      <div className="grid-2 mt-16">
        <div className="card">
          <div className="card-header">
            <h3>Incident {inc.id}</h3>
            <span className={`badge badge-${inc.severity === 'High' ? 'danger' : inc.severity === 'Medium' ? 'warning' : 'info'}`}>
              {inc.severity} Severity
            </span>
          </div>

          <table className="data-table">
            <tbody>
              <tr><td className="font-semibold" style={{ width: 140 }}>Status</td><td><span className="badge badge-warning">{inc.status}</span></td></tr>
              <tr><td className="font-semibold">Policy Matched</td><td><span className={`badge ${inc.policy_matched ? 'badge-success' : 'badge-danger'}`}>{inc.policy_matched ? 'Yes' : 'No'}</span></td></tr>
              <tr><td className="font-semibold">File</td><td>{inc.file_name}</td></tr>
              <tr><td className="font-semibold">Sender</td><td>{inc.sender}</td></tr>
              <tr><td className="font-semibold">Channel</td><td>{inc.channel}</td></tr>
              <tr><td className="font-semibold">Timestamp</td><td>{inc.timestamp}</td></tr>
            </tbody>
          </table>

          {inc.sits_detected?.length > 0 && (
            <div className="mt-16">
              <label className="font-semibold text-sm">SITs Detected</label>
              <div className="chip-group mt-8">
                {inc.sits_detected.map(s => <span key={s} className="badge badge-info">{s}</span>)}
              </div>
            </div>
          )}

          {inc.auto_actions_taken?.length > 0 && (
            <div className="mt-16">
              <label className="font-semibold text-sm">Automated Actions Taken</label>
              {inc.auto_actions_taken.map((a, i) => (
                <div key={i} className="alert alert-info mt-8" style={{ padding: '6px 10px', margin: '4px 0' }}>
                  <span className="text-sm">{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Insider Risk Signals */}
          {data.insider_risk_signals?.length > 0 && (
            <div className="mt-16">
              <div className="flex-between mb-8">
                <label className="font-semibold text-sm">Insider Risk Signals</label>
                <span className={`badge ${data.cumulative_risk_score > 50 ? 'badge-danger' : 'badge-warning'}`}>
                  Risk: {data.cumulative_risk_score}
                </span>
              </div>
              <div className="timeline">
                {data.insider_risk_signals.map((signal, i) => (
                  <div key={i} className={`timeline-item ${signal.risk_delta >= 20 ? 'risk-high' : signal.risk_delta >= 10 ? 'risk-medium' : ''}`}>
                    <div className="timeline-time">{new Date(signal.timestamp).toLocaleString()}</div>
                    <div className="timeline-content">{signal.action}</div>
                    <div className="timeline-delta">+{signal.risk_delta} risk</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Incident Review</h3></div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
              <span>I acknowledge this incident and will review it</span>
            </label>
          </div>

          <div className="form-group mt-16">
            <label>Assigned Priority</label>
            <div className="radio-group mt-8">
              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                <div key={p} className={`radio-option${priority === p ? ' selected' : ''}`} onClick={() => setPriority(p)}>
                  <input type="radio" checked={priority === p} onChange={() => setPriority(p)} />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group mt-16">
            <label>Investigation Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Document your initial observations, key findings, and next steps..."
              rows={6}
            />
            <p className="hint">Detailed notes improve your score. Describe what you observe and what actions are needed.</p>
          </div>

          <button
            className="btn btn-primary btn-lg mt-16"
            onClick={handleSubmit}
            disabled={!acknowledged || !priority || loading || (timeLeft !== null && timeLeft <= 0)}
            style={{ width: '100%' }}
          >
            {loading ? 'Submitting...' : 'Submit & Continue to Analyst Decision →'}
          </button>
        </div>
      </div>
    </div>
  );
}
