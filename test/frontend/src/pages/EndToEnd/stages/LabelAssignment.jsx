import { useState, useEffect } from 'react';

const LABELS = [
  { value: 'Public', color: '#107c10', description: 'No restrictions. Safe for external sharing.' },
  { value: 'General', color: '#0078d4', description: 'Internal use. No sensitive data.' },
  { value: 'Confidential', color: '#ff8c00', description: 'Business-sensitive. Limited sharing.' },
  { value: 'Highly Confidential', color: '#d13438', description: 'Extremely sensitive. Strict access controls. Encryption required.' },
];

export default function LabelAssignment({ data, onSubmit, loading, realityMode }) {
  const [selectedLabel, setSelectedLabel] = useState('');
  const [showReverse, setShowReverse] = useState(false);
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleSubmit = () => {
    onSubmit(2, { selected_label: selectedLabel });
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 2: {data.title}</h2>
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
            <h3>Assign Sensitivity Label</h3>
            {data.reverse_mode_available && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowReverse(!showReverse)}>
                {showReverse ? 'Hide' : 'Show'} Reverse Mode
              </button>
            )}
          </div>

          <p className="text-sm text-muted mb-16">File: <strong>{data.file_name}</strong></p>

          <div className="radio-group">
            {LABELS.map(l => (
              <div
                key={l.value}
                className={`radio-option${selectedLabel === l.value ? ' selected' : ''}`}
                onClick={() => setSelectedLabel(l.value)}
                style={{ borderLeft: `4px solid ${l.color}` }}
              >
                <input type="radio" checked={selectedLabel === l.value} onChange={() => setSelectedLabel(l.value)} />
                <div>
                  <strong>{l.value}</strong>
                  <p className="text-sm text-muted">{l.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg mt-24"
            onClick={handleSubmit}
            disabled={!selectedLabel || loading || (timeLeft !== null && timeLeft <= 0)}
            style={{ width: '100%' }}
          >
            {loading ? 'Submitting...' : 'Submit & Continue to SIT Detection →'}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><h3>Label Reference</h3></div>
          {data.label_descriptions && Object.entries(data.label_descriptions).map(([label, desc]) => (
            <div key={label} className="mb-8" style={{ padding: '8px 12px', borderLeft: `3px solid ${LABELS.find(l => l.value === label)?.color || '#ccc'}`, background: '#fafafa', borderRadius: 4 }}>
              <strong className="text-sm">{label}</strong>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}

          {showReverse && (
            <div className="what-if-panel mt-16">
              <h4>Reverse Mode</h4>
              <p className="text-sm text-muted mb-8">{data.reverse_mode_hint}</p>
              <p className="text-sm">Think: what types of documents should carry each label? Does this file match?</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
