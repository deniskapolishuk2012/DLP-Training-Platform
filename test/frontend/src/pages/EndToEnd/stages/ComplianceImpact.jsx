import { useState } from 'react';

export default function ComplianceImpact({ data, onSubmit, loading }) {
  const [acknowledgedImpact, setAcknowledgedImpact] = useState(false);
  const [remediationPlan, setRemediationPlan] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);

  const handleSubmit = () => {
    onSubmit(7, {
      acknowledged_impact: acknowledgedImpact,
      remediation_plan: remediationPlan,
      accept_preventive_policy: acceptPolicy,
    });
  };

  const fmtCurrency = (n) => '$' + Number(n).toLocaleString();

  return (
    <div>
      <h2 style={{ fontSize: 18 }} className="mb-8">Stage 7: {data.title}</h2>
      <p className="text-sm text-muted mb-16">{data.description}</p>

      {data.cascade_warnings?.map((w, i) => (
        <div key={i} className="cascade-warning">{w}</div>
      ))}

      <div className="grid-2 mt-16">
        <div>
          {/* Impact Summary */}
          <div className="card mb-16">
            <div className="card-header"><h3>Compliance Impact Summary</h3></div>
            <table className="data-table">
              <tbody>
                <tr><td className="font-semibold" style={{ width: 180 }}>Risk Level</td><td><span className={`badge badge-${data.risk_level === 'Critical' ? 'danger' : 'warning'}`}>{data.risk_level}</span></td></tr>
                <tr><td className="font-semibold">Regulations Violated</td><td>{data.regulations_violated?.join(', ')}</td></tr>
                <tr><td className="font-semibold">Base Fine Range</td><td>{data.base_fine_range}</td></tr>
                <tr>
                  <td className="font-semibold">Adjusted Maximum Fine</td>
                  <td>
                    <span className="text-danger font-semibold" style={{ fontSize: 18 }}>{fmtCurrency(data.adjusted_max_fine)}</span>
                    {data.fine_multiplier > 1 && (
                      <span className="badge badge-danger" style={{ marginLeft: 8 }}>{data.fine_multiplier}x multiplier</span>
                    )}
                  </td>
                </tr>
                <tr><td className="font-semibold">Audit Probability</td><td>{(data.adjusted_audit_probability * 100).toFixed(0)}% {data.adjusted_audit_probability > data.base_audit_probability && <span className="text-danger text-sm">(+{((data.adjusted_audit_probability - data.base_audit_probability) * 100).toFixed(0)}%)</span>}</td></tr>
                <tr><td className="font-semibold">Remediation Time</td><td>{data.adjusted_remediation_days} days {data.adjusted_remediation_days > data.base_remediation_days && <span className="text-danger text-sm">(+{data.adjusted_remediation_days - data.base_remediation_days} days)</span>}</td></tr>
                <tr><td className="font-semibold">Reputational Impact</td><td>{data.reputational_impact}</td></tr>
                <tr><td className="font-semibold">Legal Exposure</td><td>{data.legal_exposure}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Impact Timeline */}
          {data.impact_timeline && (
            <div className="card mb-16">
              <div className="card-header"><h3>Impact Timeline</h3></div>
              <div className="timeline">
                {data.impact_timeline.map((event, i) => (
                  <div key={i} className={`timeline-item ${event.cost > 100000 ? 'risk-high' : event.cost > 10000 ? 'risk-medium' : ''}`}>
                    <div className="timeline-time">Day {event.day}</div>
                    <div className="timeline-content">{event.event}</div>
                    {event.cost > 0 && <div className="timeline-delta">Cost: {fmtCurrency(event.cost)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Preventive Policy */}
          {data.preventive_policy_suggestion && (
            <div className="card mb-16">
              <div className="card-header"><h3>Preventive Policy Generator</h3></div>
              <div className="form-group">
                <label>Generated Policy</label>
                <p className="font-semibold">{data.preventive_policy_suggestion.name}</p>
                <p className="text-sm text-muted mt-4">{data.preventive_policy_suggestion.description}</p>
              </div>

              <div className="form-group">
                <label>Conditions ({data.preventive_policy_suggestion.logic})</label>
                {data.preventive_policy_suggestion.conditions.map((c, i) => (
                  <div key={i} className="alert alert-info" style={{ padding: '6px 10px', marginBottom: 4 }}>
                    <span className="text-sm">{c.type} <strong>{c.operator}</strong> "{c.value}"</span>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Actions</label>
                <div className="chip-group">
                  {data.preventive_policy_suggestion.actions.map((a, i) => (
                    <span key={i} className="badge badge-danger">{a}</span>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 12 }}>
                <input type="checkbox" checked={acceptPolicy} onChange={e => setAcceptPolicy(e.target.checked)} />
                <span className="text-sm font-semibold">Accept this preventive policy</span>
              </label>
            </div>
          )}

          {/* Remediation */}
          <div className="card">
            <div className="card-header"><h3>Your Response</h3></div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={acknowledgedImpact} onChange={e => setAcknowledgedImpact(e.target.checked)} />
                <span>I acknowledge the compliance impact and associated risks</span>
              </label>
            </div>

            <div className="form-group mt-16">
              <label>Remediation Plan</label>
              <textarea
                value={remediationPlan}
                onChange={e => setRemediationPlan(e.target.value)}
                placeholder="Outline your remediation steps: immediate actions, notification requirements, policy changes, training needs, timeline..."
                rows={8}
              />
              <p className="hint">A thorough remediation plan covers: immediate containment, regulatory notification, policy improvements, user training, and monitoring.</p>
            </div>

            <button
              className="btn btn-primary btn-lg mt-16"
              onClick={handleSubmit}
              disabled={!acknowledgedImpact || loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Finalizing...' : 'Complete Simulation & View Scorecard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
