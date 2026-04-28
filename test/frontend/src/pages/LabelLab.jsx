import { useState } from 'react';
import { api } from '../api/client';

const SCENARIOS = [
  { id: 'financial_leak', title: 'Q3 Earnings Draft', description: 'Spreadsheet with unannounced financial results, revenue figures, and EPS data.' },
  { id: 'healthcare_breach', title: 'Patient Records Dataset', description: 'CSV containing SSNs, diagnoses, medications, and insurance IDs for 2,851 patients.' },
  { id: 'ip_theft_simple', title: 'Proprietary Source Code', description: 'Archive containing payment gateway source code with embedded API keys.' },
];

const LABELS = [
  { value: 'Public', color: '#107c10', description: 'Information intended for public disclosure' },
  { value: 'General', color: '#0078d4', description: 'Internal business data, not sensitive' },
  { value: 'Confidential', color: '#ff8c00', description: 'Sensitive business data, limited distribution' },
  { value: 'Highly Confidential', color: '#d13438', description: 'Extremely sensitive, strict access controls' },
];

export default function LabelLab() {
  const [mode, setMode] = useState('assign');
  const [scenario, setScenario] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [result, setResult] = useState(null);
  const [reverseLabel, setReverseLabel] = useState('');
  const [reverseResult, setReverseResult] = useState(null);

  const handleEvaluate = async () => {
    if (!scenario || !selectedLabel) return;
    try {
      const res = await api.evaluateLabel({ scenario_id: scenario.id, selected_label: selectedLabel });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  const handleReverse = async () => {
    if (!reverseLabel) return;
    try {
      const res = await api.reverseLabel({ label: reverseLabel });
      setReverseResult(res);
    } catch (e) {
      setReverseResult({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Label Lab</h1>
        <p>Practice assigning Microsoft Purview sensitivity labels. Includes Reverse Mode for label-to-data mapping.</p>
      </div>

      <div className="flex gap-8 mb-16">
        <button className={`btn ${mode === 'assign' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('assign')}>Assign Labels</button>
        <button className={`btn ${mode === 'reverse' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('reverse')}>Reverse Mode</button>
      </div>

      {mode === 'assign' && (
        <div className="grid-2">
          <div>
            <div className="card mb-16">
              <div className="card-header"><h3>Select Scenario</h3></div>
              {SCENARIOS.map(s => (
                <div key={s.id} className={`radio-option${scenario?.id === s.id ? ' selected' : ''}`}
                  onClick={() => { setScenario(s); setResult(null); setSelectedLabel(''); }} style={{ marginBottom: 8 }}>
                  <div>
                    <strong>{s.title}</strong>
                    <p className="text-sm text-muted">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {scenario && (
              <div className="card">
                <div className="card-header"><h3>Assign Label</h3></div>
                {LABELS.map(l => (
                  <div key={l.value}
                    className={`radio-option${selectedLabel === l.value ? ' selected' : ''}`}
                    onClick={() => setSelectedLabel(l.value)}
                    style={{ marginBottom: 6, borderLeft: `4px solid ${l.color}` }}>
                    <input type="radio" checked={selectedLabel === l.value} onChange={() => setSelectedLabel(l.value)} />
                    <div>
                      <strong>{l.value}</strong>
                      <p className="text-sm text-muted">{l.description}</p>
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary mt-16" onClick={handleEvaluate} disabled={!selectedLabel}>Check Label</button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>Result</h3></div>
            {result ? (
              <>
                <div className={`alert ${result.correct ? 'alert-success' : 'alert-danger'}`}>
                  <strong>{result.correct ? 'Correct!' : 'Incorrect'}</strong> — Score: {result.score}/100
                </div>
                <p className="text-sm mt-8">{result.feedback}</p>
                {result.correct_label && !result.correct && (
                  <p className="text-sm mt-8">Correct label: <strong>{result.correct_label}</strong></p>
                )}
              </>
            ) : (
              <p className="text-muted text-sm">Select a scenario and assign a label to see results.</p>
            )}
          </div>
        </div>
      )}

      {mode === 'reverse' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Reverse Mode</h3></div>
            <p className="text-sm text-muted mb-16">Given a sensitivity label, identify which types of data should carry that label.</p>
            <div className="form-group">
              <label>Select Label</label>
              <select value={reverseLabel} onChange={e => setReverseLabel(e.target.value)}>
                <option value="">— Choose —</option>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.value}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleReverse} disabled={!reverseLabel}>Show Data Types</button>
          </div>
          <div className="card">
            <div className="card-header"><h3>Data Types for "{reverseLabel || '...'}"</h3></div>
            {reverseResult ? (
              <ul style={{ paddingLeft: 20 }}>
                {reverseResult.data_types.map((dt, i) => <li key={i} className="mb-8 text-sm">{dt}</li>)}
              </ul>
            ) : (
              <p className="text-muted text-sm">Select a label to see matching data types.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
