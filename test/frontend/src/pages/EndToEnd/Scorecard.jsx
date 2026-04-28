export default function Scorecard({ scorecard, stageResults }) {
  if (!scorecard) {
    return (
      <div className="card">
        <p className="text-muted">Scorecard is being calculated...</p>
      </div>
    );
  }

  const overall = scorecard.overall_score;
  const scoreClass = overall >= 80 ? 'excellent' : overall >= 60 ? 'good' : overall >= 40 ? 'fair' : 'poor';
  const grade = scorecard.detail_breakdown?.grade || '';

  const dimensions = [
    { label: 'Labeling Accuracy', score: scorecard.labeling_score, color: '#0078d4' },
    { label: 'SIT Detection', score: scorecard.detection_score, color: '#5c2d91' },
    { label: 'Policy Effectiveness', score: scorecard.policy_effectiveness, color: '#107c10' },
    { label: 'Decision Quality', score: scorecard.decision_quality, color: '#ff8c00' },
    { label: 'FP Management', score: scorecard.fp_impact, color: '#d13438' },
    { label: 'Insider Risk', score: scorecard.insider_risk_score, color: '#008272' },
    { label: 'Compliance', score: scorecard.compliance_score, color: '#004e8c' },
  ];

  return (
    <div>
      {/* Overall Score */}
      <div className="card mb-24" style={{ textAlign: 'center', padding: 32 }}>
        <div className={`score-circle ${scoreClass}`} style={{ width: 140, height: 140, margin: '0 auto 16px' }}>
          <span className="score-value" style={{ fontSize: 40 }}>{overall}</span>
          <span className="score-label" style={{ fontSize: 12 }}>/ 100</span>
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Final Score</h2>
        <p className="text-muted">{grade}</p>
      </div>

      {/* Dimension Breakdown */}
      <div className="card mb-24">
        <div className="card-header"><h3>Score Breakdown</h3></div>
        <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {dimensions.map(d => (
            <div key={d.label} className="card metric-card">
              <div className="metric-value" style={{ color: d.color, fontSize: 24 }}>{d.score}</div>
              <div className="metric-label">{d.label}</div>
              <div style={{ marginTop: 8, height: 4, background: '#f3f2f1', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${d.score}%`, height: '100%', background: d.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage-by-Stage Scores */}
      {stageResults && stageResults.length > 0 && (
        <div className="card mb-24">
          <div className="card-header"><h3>Stage-by-Stage Results</h3></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Score</th>
                <th>Status</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {stageResults.map((sr, i) => (
                <tr key={i}>
                  <td className="font-semibold">Stage {sr.stageNumber}</td>
                  <td>
                    <span className={`badge ${sr.score >= 70 ? 'badge-success' : sr.score >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                      {sr.score}/{sr.maxScore}
                    </span>
                  </td>
                  <td>
                    {sr.score >= 70 ? (
                      <span className="text-success font-semibold text-sm">Good</span>
                    ) : sr.score >= 40 ? (
                      <span className="text-warning font-semibold text-sm">Needs Work</span>
                    ) : (
                      <span className="text-danger font-semibold text-sm">Poor</span>
                    )}
                  </td>
                  <td className="text-sm">{sr.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cascade Summary */}
      {scorecard.cascade_summary && scorecard.cascade_summary.length > 0 && (
        <div className="card mb-24">
          <div className="card-header">
            <h3>Cascade Effects</h3>
            <span className="badge badge-danger">{scorecard.cascade_summary.length} cascading issues</span>
          </div>
          <p className="text-sm text-muted mb-16">
            These are the ripple effects of your decisions. Early mistakes in labeling and detection propagate through the entire DLP lifecycle.
          </p>
          {scorecard.cascade_summary.map((c, i) => (
            <div key={i} className="cascade-warning">
              <strong>Stage {c.stage}:</strong> {c.effect}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {scorecard.recommendations && scorecard.recommendations.length > 0 && (
        <div className="card mb-24">
          <div className="card-header"><h3>Optimization Recommendations</h3></div>
          {scorecard.recommendations.map((rec, i) => (
            <div key={i} className="alert alert-info mb-8">
              <span className="text-sm">{rec}</span>
            </div>
          ))}
        </div>
      )}

      {/* Weights */}
      {scorecard.detail_breakdown?.weights && (
        <div className="card">
          <div className="card-header"><h3>Scoring Methodology</h3></div>
          <table className="data-table">
            <thead><tr><th>Dimension</th><th>Weight</th></tr></thead>
            <tbody>
              {Object.entries(scorecard.detail_breakdown.weights).map(([key, val]) => (
                <tr key={key}>
                  <td className="text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                  <td className="text-sm font-semibold">{(val * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
