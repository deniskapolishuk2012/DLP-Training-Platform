import { useState } from 'react';
import { api } from '../api/client';

const ALL_SITS = [
  'Credit Card Number', 'Social Security Number', 'Financial Statement',
  'Revenue Figure', 'Stock Ticker', 'Material Non-Public Info (MNPI)',
  'Patient Health Information', 'Medical Diagnosis', 'Insurance ID',
  'Date of Birth', 'Person Name', 'API Key / Secret',
  'Source Code (Proprietary)', 'Cryptographic Key', 'Internal IP Address',
  'Bank Account Number', 'Passport Number', "Driver's License",
  'Email Address', 'Phone Number',
];

const SCENARIOS = [
  { id: 'financial_leak', title: 'Q3 Earnings Draft — Financial Data' },
  { id: 'healthcare_breach', title: 'Patient Records — Healthcare PHI' },
  { id: 'ip_theft_simple', title: 'Source Code — Intellectual Property' },
];

export default function SITBuilder() {
  const [scenario, setScenario] = useState('');
  const [selectedSits, setSelectedSits] = useState([]);
  const [result, setResult] = useState(null);

  const toggleSit = (sit) => {
    setSelectedSits(prev => prev.includes(sit) ? prev.filter(s => s !== sit) : [...prev, sit]);
  };

  const handleTest = async () => {
    if (!scenario) return;
    try {
      const res = await api.testSitDetection({ scenario_id: scenario, selected_sits: selectedSits });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>SIT Builder</h1>
        <p>Select which Sensitive Information Types to detect and test accuracy against real scenarios.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Configure Detection</h3></div>
          <div className="form-group">
            <label>Test Scenario</label>
            <select value={scenario} onChange={e => { setScenario(e.target.value); setResult(null); }}>
              <option value="">— Select scenario —</option>
              {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <label className="font-semibold mb-8" style={{ display: 'block' }}>Select SITs to Detect</label>
          <div className="chip-group">
            {ALL_SITS.map(sit => (
              <span key={sit} className={`chip${selectedSits.includes(sit) ? ' selected' : ''}`} onClick={() => toggleSit(sit)}>
                {sit}
              </span>
            ))}
          </div>

          <div className="flex-between mt-16">
            <span className="text-sm text-muted">{selectedSits.length} SITs selected</span>
            <div className="flex gap-8">
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedSits([])}>Clear</button>
              <button className="btn btn-primary btn-sm" onClick={handleTest} disabled={!scenario}>Test Detection</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Detection Results</h3></div>
          {result ? (
            result.error ? (
              <div className="alert alert-danger">{result.error}</div>
            ) : (
              <>
                <div className="grid-2 mb-16">
                  <div className="card metric-card">
                    <div className="metric-value" style={{ color: '#0078d4' }}>{(result.precision * 100).toFixed(0)}%</div>
                    <div className="metric-label">Precision</div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-value" style={{ color: '#107c10' }}>{(result.recall * 100).toFixed(0)}%</div>
                    <div className="metric-label">Recall</div>
                  </div>
                </div>

                {result.true_positives.length > 0 && (
                  <div className="mb-16">
                    <label className="font-semibold text-sm text-success">True Positives ({result.true_positives.length})</label>
                    <div className="chip-group mt-8">
                      {result.true_positives.map(s => <span key={s} className="badge badge-success">{s}</span>)}
                    </div>
                  </div>
                )}

                {result.false_positives.length > 0 && (
                  <div className="mb-16">
                    <label className="font-semibold text-sm text-danger">False Positives ({result.false_positives.length})</label>
                    <div className="chip-group mt-8">
                      {result.false_positives.map(s => <span key={s} className="badge badge-danger">{s}</span>)}
                    </div>
                  </div>
                )}

                {result.false_negatives.length > 0 && (
                  <div className="mb-16">
                    <label className="font-semibold text-sm text-warning">Missed (False Negatives — {result.false_negatives.length})</label>
                    <div className="chip-group mt-8">
                      {result.false_negatives.map(s => <span key={s} className="badge badge-warning">{s}</span>)}
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <p className="text-muted text-sm">Select SITs and test to see detection accuracy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
