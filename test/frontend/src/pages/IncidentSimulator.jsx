import { useState } from 'react';
import { api } from '../api/client';

const SAMPLE_INCIDENTS = [
  {
    id: 'tp-financial',
    title: 'Financial Data Sent Externally',
    type: 'true_positive',
    severity: 'High',
    description: 'Employee emailed Q3 earnings draft to external consultant. Policy "Block External Financial Sharing" triggered. File contains revenue figures, EPS, and material non-public information.',
    sits: ['Financial Statement', 'Revenue Figure', 'MNPI'],
    sender: 'sarah.chen@contoso.com',
    recipient: 'consultant@advisory-group.com',
  },
  {
    id: 'fp-marketing',
    title: 'Marketing Report Flagged',
    type: 'false_positive',
    severity: 'Low',
    description: 'Marketing team shared published quarterly results summary with press contacts. Policy triggered because content matched "Financial Statement" SIT, but this data is already public.',
    sits: ['Financial Statement'],
    sender: 'marketing@contoso.com',
    recipient: 'press@reuters.com',
  },
  {
    id: 'tp-healthcare',
    title: 'Patient Records in Teams Channel',
    type: 'true_positive',
    severity: 'Critical',
    description: 'Researcher shared patient dataset with SSNs, diagnoses, and insurance IDs in a broad Teams channel accessible by non-clinical staff.',
    sits: ['SSN', 'Patient Health Information', 'Medical Diagnosis', 'Insurance ID'],
    sender: 'james.miller@contoso-health.com',
    recipient: '#research-collab (25 members)',
  },
];

const ANALYST_ACTIONS = [
  { id: 'true_positive_block', label: 'Confirm & Block — True Positive', category: 'tp' },
  { id: 'true_positive_escalate', label: 'Confirm & Escalate to Legal', category: 'tp' },
  { id: 'true_positive_remediate', label: 'Confirm & Remediate', category: 'tp' },
  { id: 'false_positive_dismiss', label: 'Dismiss — False Positive', category: 'fp' },
  { id: 'false_positive_tune', label: 'Dismiss & Tune Policy', category: 'fp' },
  { id: 'needs_investigation', label: 'Needs Further Investigation', category: 'investigate' },
  { id: 'insider_risk_referral', label: 'Refer to Insider Risk Team', category: 'escalate' },
];

export default function IncidentSimulator() {
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [justification, setJustification] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!selected || !action) return;
    try {
      const res = await api.incidentEvaluate({
        action,
        justification,
        incident_type: selected.type,
      });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Incident Simulator</h1>
        <p>Practice DLP incident triage — review incidents, make decisions, and provide justification.</p>
      </div>

      <div className="grid-3 mb-24">
        {SAMPLE_INCIDENTS.map(inc => (
          <div
            key={inc.id}
            className={`card scenario-card${selected?.id === inc.id ? ' selected' : ''}`}
            onClick={() => { setSelected(inc); setResult(null); setAction(''); setJustification(''); }}
          >
            <div className="flex-between mb-8">
              <span className={`badge badge-${inc.severity === 'Critical' ? 'danger' : inc.severity === 'High' ? 'warning' : 'info'}`}>
                {inc.severity}
              </span>
              <span className="badge badge-neutral">{inc.type === 'true_positive' ? 'TP' : 'FP'}</span>
            </div>
            <h3 style={{ fontSize: 14 }}>{inc.title}</h3>
            <p className="text-sm text-muted mt-8">{inc.description.slice(0, 100)}...</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Incident Details</h3></div>
            <div className="form-group"><label>Sender</label><p>{selected.sender}</p></div>
            <div className="form-group"><label>Recipient</label><p>{selected.recipient}</p></div>
            <div className="form-group"><label>Description</label><p className="text-sm">{selected.description}</p></div>
            <div className="form-group">
              <label>Detected SITs</label>
              <div className="chip-group">{selected.sits.map(s => <span key={s} className="badge badge-info">{s}</span>)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Analyst Decision</h3></div>
            <div className="radio-group">
              {ANALYST_ACTIONS.map(a => (
                <div key={a.id} className={`radio-option${action === a.id ? ' selected' : ''}`} onClick={() => setAction(a.id)}>
                  <input type="radio" checked={action === a.id} onChange={() => setAction(a.id)} />
                  {a.label}
                </div>
              ))}
            </div>

            <div className="form-group mt-16">
              <label>Justification</label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)} placeholder="Explain your decision..." rows={4} />
            </div>

            <button className="btn btn-primary mt-8" onClick={handleSubmit} disabled={!action}>Submit Decision</button>

            {result && (
              <div className={`alert ${result.correct ? 'alert-success' : 'alert-danger'} mt-16`}>
                <div className="flex-between">
                  <strong>{result.correct ? 'Correct!' : 'Incorrect'}</strong>
                  <span className="badge badge-neutral">Score: {result.score}/100</span>
                </div>
                <p className="mt-8 text-sm">{result.feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
