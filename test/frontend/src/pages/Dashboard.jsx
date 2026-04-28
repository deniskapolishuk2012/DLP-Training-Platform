import { Link } from 'react-router-dom';

const modules = [
  {
    to: '/end-to-end',
    title: 'End-to-End DLP Simulation',
    desc: 'The capstone module — experience the complete 7-stage DLP lifecycle. Every decision cascades forward. The most realistic DLP training available.',
    flagship: true,
    badge: 'Flagship',
  },
  {
    to: '/policy-simulator',
    title: 'Policy Simulator',
    desc: 'Build DLP policies with AND/OR condition grouping, run multi-scenario simulations, and analyze with TP/FP/FN/TN metrics, Precision/Recall/F1.',
    badge: 'Advanced',
  },
  {
    to: '/incident-simulator',
    title: 'Incident Simulator',
    desc: 'Practice incident triage — review DLP incidents, make analyst decisions, and provide justification.',
    badge: 'Core',
  },
  {
    to: '/label-lab',
    title: 'Label Lab',
    desc: 'Practice assigning Microsoft Purview sensitivity labels. Includes Reverse Mode for label-to-data mapping.',
    badge: 'Core',
  },
  {
    to: '/sit-builder',
    title: 'SIT Builder',
    desc: 'Configure Sensitive Information Types and test detection accuracy with Precision/Recall metrics.',
    badge: 'Core',
  },
  {
    to: '/false-positive-lab',
    title: 'False Positive Lab',
    desc: 'Analyze false positive patterns and get AI-powered optimization suggestions to reduce noise.',
    badge: 'Advanced',
  },
  {
    to: '/insider-risk',
    title: 'Insider Risk',
    desc: 'Analyze behavioral timelines, cumulative risk scores, and insider threat indicators.',
    badge: 'Advanced',
  },
  {
    to: '/compliance-lab',
    title: 'Compliance Lab',
    desc: 'Explore regulatory impact of DLP failures. Full Impact Engine with Preventive Policy Generator.',
    badge: 'Advanced',
  },
];

export default function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <h1>DLP Training Platform</h1>
        <p>Master Microsoft Purview Data Loss Prevention through hands-on simulation and practice.</p>
      </div>

      <div className="alert alert-info mb-24">
        <strong>New:</strong> The End-to-End DLP Simulation is now available — the most comprehensive DLP training exercise
        that flows through the complete lifecycle from data creation to compliance impact.
      </div>

      <div className="grid-2">
        {modules.map(m => (
          <Link key={m.to} to={m.to} className={`module-card${m.flagship ? ' flagship' : ''}`}>
            <div className="flex-between mb-8">
              <h3>{m.title}</h3>
              <span className={`badge ${m.flagship ? '' : m.badge === 'Advanced' ? 'badge-warning' : 'badge-info'}`}
                style={m.flagship ? { background: 'rgba(255,255,255,.2)', color: '#fff' } : {}}>
                {m.badge}
              </span>
            </div>
            <p>{m.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card mt-24">
        <div className="card-header"><h3>Learning Path</h3></div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '8px 0' }}>
          {[
            { step: 1, label: 'Label Lab', desc: 'Learn sensitivity labels' },
            { step: 2, label: 'SIT Builder', desc: 'Configure detection' },
            { step: 3, label: 'Policy Simulator', desc: 'Build & test policies' },
            { step: 4, label: 'Incident Simulator', desc: 'Practice triage' },
            { step: 5, label: 'Advanced Labs', desc: 'FP, Insider, Compliance' },
            { step: 6, label: 'End-to-End', desc: 'Complete lifecycle' },
          ].map((s, i, arr) => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: s.step === 6 ? 'var(--brand-primary)' : '#f3f2f1',
                  color: s.step === 6 ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 32, height: 2, background: 'var(--border-strong)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
