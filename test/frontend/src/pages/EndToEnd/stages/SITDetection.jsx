import { useState, useEffect } from 'react';

const ALL_SITS = [
  'Credit Card Number', 'Social Security Number', 'Financial Statement',
  'Revenue Figure', 'Stock Ticker', 'Material Non-Public Info (MNPI)',
  'Patient Health Information', 'Medical Diagnosis', 'Insurance ID',
  'Date of Birth', 'Person Name', 'API Key / Secret',
  'Source Code (Proprietary)', 'Cryptographic Key', 'Internal IP Address',
  'Bank Account Number', 'Passport Number', "Driver's License",
  'Email Address', 'Phone Number',
];

export default function SITDetection({ data, onSubmit, loading, realityMode }) {
  const [selectedSits, setSelectedSits] = useState([]);
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const toggleSit = (sit) => {
    setSelectedSits(prev => prev.includes(sit) ? prev.filter(s => s !== sit) : [...prev, sit]);
  };

  const handleSubmit = () => {
    onSubmit(3, { selected_sits: selectedSits });
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 3: {data.title}</h2>
        {timeLeft !== null && (
          <div className={`timer${timeLeft < 30 ? '' : ' warning'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      <p className="text-sm text-muted mb-8">{data.description}</p>
      <p className="text-sm mb-16">Current label: <span className="badge badge-info">{data.chosen_label}</span></p>

      {data.cascade_warnings?.map((w, i) => (
        <div key={i} className="cascade-warning">{w}</div>
      ))}

      <div className="grid-2 mt-16">
        <div className="card">
          <div className="card-header">
            <h3>Select SITs to Detect</h3>
            <span className="badge badge-neutral">{selectedSits.length} selected</span>
          </div>

          {data.hint && <div className="alert alert-info mb-16">{data.hint}</div>}

          <div className="chip-group">
            {ALL_SITS.map(sit => (
              <span
                key={sit}
                className={`chip${selectedSits.includes(sit) ? ' selected' : ''}`}
                onClick={() => toggleSit(sit)}
              >
                {sit}
              </span>
            ))}
          </div>

          <div className="flex gap-8 mt-16">
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedSits([])}>Clear All</button>
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedSits([...ALL_SITS])}>Select All</button>
          </div>

          <button
            className="btn btn-primary btn-lg mt-24"
            onClick={handleSubmit}
            disabled={selectedSits.length === 0 || loading || (timeLeft !== null && timeLeft <= 0)}
            style={{ width: '100%' }}
          >
            {loading ? 'Submitting...' : 'Submit & Continue to Policy Evaluation →'}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><h3>Selected SITs</h3></div>
          {selectedSits.length === 0 ? (
            <p className="text-muted text-sm">No SITs selected yet. Click chips on the left to select.</p>
          ) : (
            <div>
              {selectedSits.map(sit => (
                <div key={sit} className="flex-between mb-8" style={{ padding: '6px 10px', background: '#f3f2f1', borderRadius: 4 }}>
                  <span className="text-sm">{sit}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleSit(sit)} style={{ padding: '2px 6px', fontSize: 10 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {!realityMode && data.sits_actually_present && (
            <div className="what-if-panel mt-16">
              <h4>Reference: SITs Present in File</h4>
              <table className="data-table">
                <thead><tr><th>SIT Type</th><th>Count</th></tr></thead>
                <tbody>
                  {data.sits_actually_present.map((s, i) => (
                    <tr key={i}>
                      <td className="text-sm">{s.type}</td>
                      <td className="text-sm">{s.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
