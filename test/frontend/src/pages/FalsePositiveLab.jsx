import { useState } from 'react';
import { api } from '../api/client';

export default function FalsePositiveLab() {
  const [fpSits, setFpSits] = useState(['Credit Card Number', 'Email Address']);
  const [customFp, setCustomFp] = useState('');
  const [result, setResult] = useState(null);

  const addFp = () => {
    if (customFp && !fpSits.includes(customFp)) {
      setFpSits([...fpSits, customFp]);
      setCustomFp('');
    }
  };

  const removeFp = (sit) => setFpSits(fpSits.filter(s => s !== sit));

  const handleAnalyze = async () => {
    try {
      const res = await api.analyzeFP({ false_positive_sits: fpSits, policy_conditions: [] });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>False Positive Lab</h1>
        <p>Analyze false positive patterns in your DLP detections and get AI-powered optimization suggestions.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>FP SIT Configuration</h3></div>
          <p className="text-sm text-muted mb-16">Add the SITs that are generating false positives in your environment.</p>

          <div className="chip-group mb-16">
            {fpSits.map(s => (
              <span key={s} className="chip selected" onClick={() => removeFp(s)} title="Click to remove">
                {s} ×
              </span>
            ))}
          </div>

          <div className="flex gap-8">
            <input type="text" value={customFp} onChange={e => setCustomFp(e.target.value)} placeholder="Add SIT name..." onKeyDown={e => e.key === 'Enter' && addFp()} />
            <button className="btn btn-outline btn-sm" onClick={addFp}>Add</button>
          </div>

          <button className="btn btn-primary mt-16" onClick={handleAnalyze} disabled={fpSits.length === 0}>
            Analyze FP Patterns
          </button>
        </div>

        <div className="card">
          <div className="card-header"><h3>Analysis & Optimization</h3></div>
          {result ? (
            result.error ? (
              <div className="alert alert-danger">{result.error}</div>
            ) : (
              <>
                <div className="alert alert-info mb-16">
                  <strong>{result.total_fps}</strong> false positive SITs analyzed
                </div>

                {result.suggestions.map((s, i) => (
                  <div key={i} className="card mb-8" style={{ padding: 12 }}>
                    <div className="flex-between mb-8">
                      <span className="badge badge-warning">{s.sit}</span>
                      <span className="text-sm text-success font-semibold">Est. FP reduction: {s.expected_fp_reduction}</span>
                    </div>
                    <p className="text-sm">{s.suggestion}</p>
                  </div>
                ))}

                <div className="what-if-panel mt-16">
                  <h4>AI Optimization Assistant</h4>
                  <p className="text-sm">{result.ai_recommendation}</p>
                </div>
              </>
            )
          ) : (
            <p className="text-muted text-sm">Add FP SITs and click Analyze to get optimization suggestions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
