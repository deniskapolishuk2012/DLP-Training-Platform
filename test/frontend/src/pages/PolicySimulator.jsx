import { useState } from 'react';
import { api } from '../api/client';

const CONDITION_TYPES = [
  { type: 'sensitivity_label', label: 'Sensitivity Label', operators: ['equals', 'not_equals', 'in'] },
  { type: 'content_contains_sit', label: 'Content Contains SIT', operators: ['contains_any', 'contains_all'] },
  { type: 'recipient_domain', label: 'Recipient / Destination', operators: ['is_external', 'is_internal'] },
  { type: 'sharing_scope', label: 'Sharing Scope', operators: ['greater_than'] },
  { type: 'file_type', label: 'File Type', operators: ['equals', 'in'] },
  { type: 'file_size', label: 'File Size (MB)', operators: ['greater_than'] },
];

const ACTIONS = [
  { id: 'block', label: 'Block' },
  { id: 'warn', label: 'Warn with Override' },
  { id: 'notify_manager', label: 'Notify Manager' },
  { id: 'notify_compliance', label: 'Notify Compliance Officer' },
  { id: 'notify_security', label: 'Alert Security Team' },
  { id: 'encrypt', label: 'Apply Encryption' },
  { id: 'audit_log', label: 'Audit Log Only' },
  { id: 'generate_incident', label: 'Generate Incident' },
  { id: 'quarantine', label: 'Quarantine Content' },
  { id: 'require_justification', label: 'Require Business Justification' },
];

function emptyCondition() {
  return { type: 'sensitivity_label', operator: 'equals', value: '' };
}

function emptyGroup() {
  return { logic: 'AND', conditions: [emptyCondition()] };
}

export default function PolicySimulator() {
  const [policyName, setPolicyName] = useState('');
  const [groups, setGroups] = useState([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState('AND');
  const [selectedActions, setSelectedActions] = useState([]);
  const [result, setResult] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [context, setContext] = useState({ label: 'Highly Confidential', detected_sits: 'Financial Statement,Revenue Figure', channel: 'Email to external', file_type: 'spreadsheet' });
  const [tab, setTab] = useState('build');

  const updateCondition = (gi, ci, field, val) => {
    const g = [...groups];
    g[gi] = { ...g[gi], conditions: g[gi].conditions.map((c, i) => i === ci ? { ...c, [field]: val } : c) };
    setGroups(g);
  };

  const addCondition = (gi) => {
    const g = [...groups];
    g[gi] = { ...g[gi], conditions: [...g[gi].conditions, emptyCondition()] };
    setGroups(g);
  };

  const removeCondition = (gi, ci) => {
    const g = [...groups];
    g[gi] = { ...g[gi], conditions: g[gi].conditions.filter((_, i) => i !== ci) };
    setGroups(g);
  };

  const toggleGroupLogic = (gi) => {
    const g = [...groups];
    g[gi] = { ...g[gi], logic: g[gi].logic === 'AND' ? 'OR' : 'AND' };
    setGroups(g);
  };

  const toggleAction = (id) => {
    setSelectedActions(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const buildPolicy = () => ({
    name: policyName || 'Custom Policy',
    condition_groups: groups,
    group_logic: groupLogic,
    actions: selectedActions.map(id => ACTIONS.find(a => a.id === id)),
  });

  const handleEvaluate = async () => {
    try {
      const ctx = {
        label: context.label,
        detected_sits: context.detected_sits.split(',').map(s => s.trim()),
        channel: context.channel,
        file_type: context.file_type,
        sharing_scope: parseInt(context.sharing_scope || '1'),
        file_size_mb: parseFloat(context.file_size_mb || '1'),
      };
      const res = await api.policyEvaluate({ policy: buildPolicy(), context: ctx });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  const handleSimulate = async () => {
    const scenarios = [
      { id: 'financial_external', context: { label: 'Highly Confidential', detected_sits: ['Financial Statement', 'Revenue Figure', 'MNPI'], channel: 'Email to external', file_type: 'spreadsheet', sharing_scope: 1, file_size_mb: 2.4 }, should_match: true },
      { id: 'internal_memo', context: { label: 'General', detected_sits: ['Email Address'], channel: 'Internal Teams chat', file_type: 'docx', sharing_scope: 5, file_size_mb: 0.1 }, should_match: false },
      { id: 'phi_broad_share', context: { label: 'Highly Confidential', detected_sits: ['SSN', 'Patient Health Information'], channel: 'Teams channel (25 members)', file_type: 'csv', sharing_scope: 25, file_size_mb: 8 }, should_match: true },
      { id: 'public_doc', context: { label: 'Public', detected_sits: [], channel: 'External website', file_type: 'pdf', sharing_scope: 100, file_size_mb: 0.5 }, should_match: false },
      { id: 'source_code', context: { label: 'Highly Confidential', detected_sits: ['API Key / Secret', 'Source Code (Proprietary)'], channel: 'Upload to public GitHub', file_type: 'archive', sharing_scope: 1000, file_size_mb: 14 }, should_match: true },
    ];
    try {
      const res = await api.policySimulate({ policy: buildPolicy(), scenarios });
      setSimResult(res);
    } catch (e) {
      setSimResult({ error: e.message });
    }
  };

  const handleWhatIf = async () => {
    const modified = { ...buildPolicy(), name: policyName + ' (What-If)' };
    if (modified.condition_groups.length > 0 && modified.condition_groups[0].conditions.length > 0) {
      modified.condition_groups[0].logic = modified.condition_groups[0].logic === 'AND' ? 'OR' : 'AND';
    }
    const ctx = {
      label: context.label,
      detected_sits: context.detected_sits.split(',').map(s => s.trim()),
      channel: context.channel,
      file_type: context.file_type,
      sharing_scope: parseInt(context.sharing_scope || '1'),
      file_size_mb: parseFloat(context.file_size_mb || '1'),
    };
    try {
      const res = await api.policyWhatIf({ original_policy: buildPolicy(), modified_policy: modified, context: ctx });
      setWhatIfResult(res);
    } catch (e) {
      setWhatIfResult({ error: e.message });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Policy Simulator</h1>
        <p>Build DLP policies with AND/OR condition grouping, simulate against scenarios, and analyze with What-If mode.</p>
      </div>

      <div className="flex gap-8 mb-16">
        {['build', 'simulate', 'what-if'].map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab(t)}>
            {t === 'build' ? 'Rule Builder' : t === 'simulate' ? 'Simulate' : 'What-If'}
          </button>
        ))}
      </div>

      {tab === 'build' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Policy Rule Builder</h3></div>
            <div className="form-group">
              <label>Policy Name</label>
              <input type="text" value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="e.g., Block External Financial Data" />
            </div>

            <div className="flex-between mb-8">
              <label className="font-semibold">Condition Groups</label>
              <div className="logic-toggle">
                <button className={groupLogic === 'AND' ? 'active' : ''} onClick={() => setGroupLogic('AND')}>AND</button>
                <button className={groupLogic === 'OR' ? 'active' : ''} onClick={() => setGroupLogic('OR')}>OR</button>
              </div>
            </div>

            {groups.map((group, gi) => (
              <div key={gi} className="condition-group">
                <div className="flex-between mb-8">
                  <span className="text-sm font-semibold">Group {gi + 1}</span>
                  <div className="flex gap-8">
                    <div className="logic-toggle">
                      <button className={group.logic === 'AND' ? 'active' : ''} onClick={() => toggleGroupLogic(gi)}>AND</button>
                      <button className={group.logic === 'OR' ? 'active' : ''} onClick={() => toggleGroupLogic(gi)}>OR</button>
                    </div>
                    {groups.length > 1 && (
                      <button className="btn btn-outline btn-sm" onClick={() => setGroups(groups.filter((_, i) => i !== gi))}>Remove</button>
                    )}
                  </div>
                </div>
                {group.conditions.map((cond, ci) => (
                  <div key={ci} className="condition-row">
                    <select value={cond.type} onChange={e => updateCondition(gi, ci, 'type', e.target.value)}>
                      {CONDITION_TYPES.map(ct => <option key={ct.type} value={ct.type}>{ct.label}</option>)}
                    </select>
                    <select value={cond.operator} onChange={e => updateCondition(gi, ci, 'operator', e.target.value)}>
                      {(CONDITION_TYPES.find(ct => ct.type === cond.type)?.operators || []).map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input type="text" value={cond.value} onChange={e => updateCondition(gi, ci, 'value', e.target.value)} placeholder="Value" />
                    {group.conditions.length > 1 && (
                      <button className="btn btn-outline btn-sm" onClick={() => removeCondition(gi, ci)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mt-8" onClick={() => addCondition(gi)}>+ Condition</button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm mt-8" onClick={() => setGroups([...groups, emptyGroup()])}>+ Condition Group</button>

            <hr className="divider" />
            <label className="font-semibold mb-8" style={{ display: 'block' }}>Actions</label>
            <div className="chip-group">
              {ACTIONS.map(a => (
                <span key={a.id} className={`chip${selectedActions.includes(a.id) ? ' selected' : ''}`} onClick={() => toggleAction(a.id)}>
                  {a.label}
                </span>
              ))}
            </div>

            <hr className="divider" />
            <label className="font-semibold mb-8" style={{ display: 'block' }}>Test Context</label>
            <div className="form-group">
              <label>Sensitivity Label</label>
              <select value={context.label} onChange={e => setContext({ ...context, label: e.target.value })}>
                {['Public', 'General', 'Confidential', 'Highly Confidential'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Detected SITs (comma-separated)</label>
              <input type="text" value={context.detected_sits} onChange={e => setContext({ ...context, detected_sits: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Channel</label>
              <input type="text" value={context.channel} onChange={e => setContext({ ...context, channel: e.target.value })} />
            </div>

            <button className="btn btn-primary mt-16" onClick={handleEvaluate}>Evaluate Policy</button>
          </div>

          <div className="card">
            <div className="card-header"><h3>Evaluation Result</h3></div>
            {result ? (
              result.error ? (
                <div className="alert alert-danger">{result.error}</div>
              ) : (
                <>
                  <div className={`alert ${result.matched ? 'alert-danger' : 'alert-success'}`}>
                    Policy <strong>{result.matched ? 'TRIGGERED' : 'NOT TRIGGERED'}</strong>
                  </div>
                  {result.triggered_actions?.length > 0 && (
                    <div className="mb-16">
                      <strong className="text-sm">Triggered Actions:</strong>
                      <div className="chip-group mt-8">
                        {result.triggered_actions.map((a, i) => (
                          <span key={i} className="badge badge-danger">{a.label || a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-16">
                    <strong className="text-sm">Explainability</strong>
                    <div className="explain-block mt-8">{result.explanation}</div>
                  </div>
                </>
              )
            ) : (
              <p className="text-muted text-sm">Configure a policy and click Evaluate to see results.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'simulate' && (
        <div className="card">
          <div className="card-header">
            <h3>Multi-Scenario Simulation</h3>
            <button className="btn btn-primary btn-sm" onClick={handleSimulate}>Run Simulation</button>
          </div>
          {simResult && !simResult.error && (
            <>
              <div className="grid-4 mb-16">
                {[
                  { label: 'Precision', value: simResult.metrics.precision, color: '#0078d4' },
                  { label: 'Recall', value: simResult.metrics.recall, color: '#107c10' },
                  { label: 'F1 Score', value: simResult.metrics.f1, color: '#ff8c00' },
                  { label: 'Accuracy', value: simResult.metrics.accuracy, color: '#5c2d91' },
                ].map(m => (
                  <div key={m.label} className="card metric-card">
                    <div className="metric-value" style={{ color: m.color }}>{(m.value * 100).toFixed(0)}%</div>
                    <div className="metric-label">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid-4 mb-16">
                <div className="card metric-card"><div className="metric-value text-success">{simResult.metrics.tp}</div><div className="metric-label">True Pos</div></div>
                <div className="card metric-card"><div className="metric-value text-danger">{simResult.metrics.fp}</div><div className="metric-label">False Pos</div></div>
                <div className="card metric-card"><div className="metric-value text-warning">{simResult.metrics.fn}</div><div className="metric-label">False Neg</div></div>
                <div className="card metric-card"><div className="metric-value" style={{ color: '#5c2d91' }}>{simResult.metrics.tn}</div><div className="metric-label">True Neg</div></div>
              </div>
              <table className="data-table">
                <thead><tr><th>Scenario</th><th>Matched</th><th>Expected</th><th>Class</th></tr></thead>
                <tbody>
                  {simResult.explainability.map((e, i) => (
                    <tr key={i}>
                      <td>{e.scenario_id}</td>
                      <td><span className={`badge ${e.matched ? 'badge-danger' : 'badge-success'}`}>{e.matched ? 'Yes' : 'No'}</span></td>
                      <td>{e.classification !== 'N/A' ? (e.classification.includes('P') && e.classification[0] === 'T' ? 'Should match' : 'Should not') : '—'}</td>
                      <td><span className={`badge ${e.classification === 'TP' || e.classification === 'TN' ? 'badge-success' : 'badge-danger'}`}>{e.classification}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'what-if' && (
        <div className="card">
          <div className="card-header">
            <h3>What-If Analysis</h3>
            <button className="btn btn-primary btn-sm" onClick={handleWhatIf}>Compare</button>
          </div>
          <p className="text-sm text-muted mb-16">Toggles the logic of Group 1 (AND↔OR) and compares the outcomes.</p>
          {whatIfResult && !whatIfResult.error && (
            <div className="grid-2">
              <div className="card">
                <h4 className="mb-8">Original Policy</h4>
                <div className={`alert ${whatIfResult.original.matched ? 'alert-danger' : 'alert-success'}`}>
                  {whatIfResult.original.matched ? 'TRIGGERED' : 'NOT TRIGGERED'}
                </div>
              </div>
              <div className="card">
                <h4 className="mb-8">Modified Policy</h4>
                <div className={`alert ${whatIfResult.modified.matched ? 'alert-danger' : 'alert-success'}`}>
                  {whatIfResult.modified.matched ? 'TRIGGERED' : 'NOT TRIGGERED'}
                </div>
              </div>
              {whatIfResult.outcome_changed && (
                <div className="alert alert-warning" style={{ gridColumn: 'span 2' }}>
                  Outcome changed! {whatIfResult.changes?.join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
