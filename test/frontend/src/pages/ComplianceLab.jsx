import { useState } from 'react';
import { api } from '../api/client';

const SCENARIOS = [
  { id: 'financial_leak', title: 'Financial Data — SOX/SEC', regs: ['SOX', 'SEC Rule 10b-5'] },
  { id: 'healthcare_breach', title: 'Patient Records — HIPAA', regs: ['HIPAA', 'HITECH Act'] },
  { id: 'ip_theft_simple', title: 'Source Code — Trade Secrets', regs: ['DTSA', 'NDA'] },
];

export default function ComplianceLab() {
  const [scenario, setScenario] = useState('');
  const [impact, setImpact] = useState(null);
  const [preventivePolicy, setPreventivePolicy] = useState(null);

  const handleImpact = async () => {
    if (!scenario) return;
    try {
      const res = await api.complianceImpact({ scenario_id: scenario });
      setImpact(res);
    } catch (e) {
      setImpact({ error: e.message });
    }
  };

  const handleGenerate = async () => {
    if (!scenario) return;
    try {
      const res = await api.generatePolicy({ scenario_id: scenario });
      setPreventivePolicy(res);
    } catch (e) {
      setPreventivePolicy({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Compliance Lab</h1>
        <p>Explore regulatory impact of DLP failures and generate preventive policies.</p>
      </div>

      <div className="grid-3 mb-24">
        {SCENARIOS.map(s => (
          <div key={s.id} className={`card scenario-card${scenario === s.id ? ' selected' : ''}`}
            onClick={() => { setScenario(s.id); setImpact(null); setPreventivePolicy(null); }}>
            <h3 style={{ fontSize: 14 }}>{s.title}</h3>
            <div className="chip-group mt-8">{s.regs.map(r => <span key={r} className="badge badge-info">{r}</span>)}</div>
          </div>
        ))}
      </div>

      {scenario && (
        <div className="flex gap-8 mb-16">
          <button className="btn btn-primary" onClick={handleImpact}>Show Impact</button>
          <button className="btn btn-outline" onClick={handleGenerate}>Generate Preventive Policy</button>
        </div>
      )}

      <div className="grid-2">
        {impact && !impact.error && (
          <div className="card">
            <div className="card-header"><h3>Compliance Impact Engine</h3></div>
            <table className="data-table">
              <tbody>
                <tr><td className="font-semibold">Regulations Violated</td><td>{impact.regulations.join(', ')}</td></tr>
                <tr><td className="font-semibold">Maximum Fine</td><td className="text-danger font-semibold">${impact.max_fine.toLocaleString()}</td></tr>
                <tr><td className="font-semibold">Fine Range</td><td>{impact.fine_range}</td></tr>
                <tr><td className="font-semibold">Risk Level</td><td><span className={`badge badge-${impact.risk_level === 'Critical' ? 'danger' : 'warning'}`}>{impact.risk_level}</span></td></tr>
                <tr><td className="font-semibold">Audit Probability</td><td>{(impact.audit_probability * 100).toFixed(0)}%</td></tr>
                <tr><td className="font-semibold">Remediation Time</td><td>{impact.remediation_days} days</td></tr>
                <tr><td className="font-semibold">Reputational Impact</td><td>{impact.reputational_impact}</td></tr>
                <tr><td className="font-semibold">Legal Exposure</td><td>{impact.legal_exposure}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {preventivePolicy && !preventivePolicy.error && (
          <div className="card">
            <div className="card-header"><h3>Generated Preventive Policy</h3></div>
            <div className="form-group">
              <label>Policy Name</label>
              <p className="font-semibold">{preventivePolicy.name}</p>
            </div>

            <div className="form-group">
              <label>Conditions ({preventivePolicy.logic})</label>
              {preventivePolicy.conditions.map((c, i) => (
                <div key={i} className="alert alert-info" style={{ padding: '6px 10px', marginBottom: 4 }}>
                  <span className="text-sm">{c.type} <strong>{c.operator}</strong> "{c.value}"</span>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Actions</label>
              <div className="chip-group">
                {preventivePolicy.actions.map((a, i) => <span key={i} className="badge badge-danger">{a}</span>)}
              </div>
            </div>

            <div className="form-group">
              <label>Rationale</label>
              <p className="text-sm">{preventivePolicy.rationale}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
