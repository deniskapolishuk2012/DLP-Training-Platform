import { useState, useEffect } from 'react';

export default function DataCreation({ data, onSubmit, loading, realityMode }) {
  const [dataType, setDataType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleSubmit = () => {
    onSubmit(1, { data_type_assessment: dataType, risk_assessment: riskLevel });
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 1: {data.title}</h2>
        {timeLeft !== null && (
          <div className={`timer${timeLeft < 30 ? '' : ' warning'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
          </div>
        )}
      </div>
      <p className="text-sm text-muted mb-16">{data.description}</p>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>File Information</h3></div>
          <table className="data-table">
            <tbody>
              <tr><td className="font-semibold" style={{ width: 120 }}>File Name</td><td>{data.file_name}</td></tr>
              <tr><td className="font-semibold">Type</td><td>{data.file_type}</td></tr>
              <tr><td className="font-semibold">Size</td><td>{data.file_size}</td></tr>
              <tr><td className="font-semibold">Author</td><td>{data.author}</td></tr>
              <tr><td className="font-semibold">Department</td><td>{data.department}</td></tr>
              <tr><td className="font-semibold">Channel</td><td>{data.channel}</td></tr>
              <tr><td className="font-semibold">Sender</td><td>{data.sender}</td></tr>
            </tbody>
          </table>

          <div className="mt-16">
            <label className="font-semibold mb-8" style={{ display: 'block' }}>File Content Preview</label>
            <div className="file-preview">
              {data.content_preview?.map((line, i) => (
                <div key={i}>{line || '\u00A0'}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Your Assessment</h3></div>

          <div className="form-group">
            <label>What type of sensitive data does this file primarily contain?</label>
            <div className="radio-group mt-8">
              {['Financial Data', 'Health Records (PHI)', 'Source Code / IP', 'Personal Data (PII)', 'General Business Data'].map(opt => (
                <div key={opt} className={`radio-option${dataType === opt ? ' selected' : ''}`} onClick={() => setDataType(opt)}>
                  <input type="radio" checked={dataType === opt} onChange={() => setDataType(opt)} />
                  {opt}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group mt-16">
            <label>What is your initial risk assessment?</label>
            <div className="radio-group mt-8">
              {[
                'Low — routine business data',
                'Medium — some sensitive elements',
                'High — clearly sensitive, needs protection',
                'Critical — immediate action required',
              ].map(opt => (
                <div key={opt} className={`radio-option${riskLevel === opt ? ' selected' : ''}`} onClick={() => setRiskLevel(opt)}>
                  <input type="radio" checked={riskLevel === opt} onChange={() => setRiskLevel(opt)} />
                  {opt}
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg mt-24"
            onClick={handleSubmit}
            disabled={!dataType || !riskLevel || loading || (timeLeft !== null && timeLeft <= 0)}
            style={{ width: '100%' }}
          >
            {loading ? 'Submitting...' : 'Submit & Continue to Labeling →'}
          </button>
        </div>
      </div>
    </div>
  );
}
