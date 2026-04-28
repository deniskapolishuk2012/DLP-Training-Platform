import { useState, useEffect } from 'react';

function emptyCondition() {
  return { type: 'sensitivity_label', operator: 'equals', value: '' };
}

function emptyGroup() {
  return { logic: 'AND', conditions: [emptyCondition()] };
}

export default function PolicyEvaluation({ data, onSubmit, onWhatIf, loading, realityMode }) {
  const [policyName, setPolicyName] = useState('');
  const [groups, setGroups] = useState([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState('AND');
  const [selectedActions, setSelectedActions] = useState([]);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(data.time_limit || null);

  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

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

  const handleSubmit = () => {
    const policy = {
      name: policyName || 'E2E Policy',
      condition_groups: groups,
      group_logic: groupLogic,
      actions: selectedActions.map(id => {
        const a = data.available_actions?.find(x => x.id === id);
        return a || { id, label: id };
      }),
    };
    onSubmit(4, { policy, policy_name: policyName, conditions: groups.flatMap(g => g.conditions), actions: selectedActions });
  };

  const handleWhatIf = async () => {
    const altGroups = groups.map(g => ({ ...g, logic: g.logic === 'AND' ? 'OR' : 'AND' }));
    const res = await onWhatIf(4, {
      policy: {
        name: policyName + ' (What-If)',
        condition_groups: altGroups,
        group_logic: groupLogic === 'AND' ? 'OR' : 'AND',
        actions: selectedActions.map(id => ({ id, label: id })),
      },
    });
    setWhatIfResult(res);
    setShowWhatIf(true);
  };

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ fontSize: 18 }}>Stage 4: {data.title}</h2>
        <div className="flex gap-8">
          {data.what_if_enabled && (
            <button className="btn btn-outline btn-sm" onClick={handleWhatIf}>What-If Mode</button>
          )}
          {timeLeft !== null && (
            <div className={`timer${timeLeft < 60 ? '' : ' warning'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-muted mb-8">{data.description}</p>

      <div className="flex gap-8 mb-16">
        <span className="badge badge-info">Label: {data.chosen_label}</span>
        <span className="badge badge-neutral">{data.detected_sits?.length || 0} SITs detected</span>
        <span className="badge badge-neutral">{data.channel}</span>
      </div>

      {data.cascade_warnings?.map((w, i) => (
        <div key={i} className="cascade-warning">{w}</div>
      ))}

      <div className="grid-2 mt-16">
        <div className="card">
          <div className="card-header"><h3>Policy Rule Builder</h3></div>

          <div className="form-group">
            <label>Policy Name</label>
            <input type="text" value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="e.g., Block External Sharing of Sensitive Data" />
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
                    {(data.available_condition_types || []).map(ct => <option key={ct.type} value={ct.type}>{ct.label}</option>)}
                  </select>
                  <select value={cond.operator} onChange={e => updateCondition(gi, ci, 'operator', e.target.value)}>
                    {(data.available_condition_types?.find(ct => ct.type === cond.type)?.operators || ['equals']).map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input type="text" value={cond.value} onChange={e => updateCondition(gi, ci, 'value', e.target.value)} placeholder="Value" />
                  {group.conditions.length > 1 && (
                    <button className="btn btn-outline btn-sm" onClick={() => removeCondition(gi, ci)}>×</button>
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
            {(data.available_actions || []).map(a => (
              <span key={a.id} className={`chip${selectedActions.includes(a.id) ? ' selected' : ''}`} onClick={() => toggleAction(a.id)} title={a.description}>
                {a.label}
              </span>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg mt-24"
            onClick={handleSubmit}
            disabled={loading || (timeLeft !== null && timeLeft <= 0)}
            style={{ width: '100%' }}
          >
            {loading ? 'Evaluating...' : 'Evaluate Policy & Continue →'}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><h3>Context & Hints</h3></div>

          <div className="form-group">
            <label>Detected SITs from Stage 3</label>
            <div className="chip-group mt-8">
              {(data.detected_sits || []).map(sit => <span key={sit} className="badge badge-info">{sit}</span>)}
            </div>
          </div>

          {!realityMode && data.optimal_policy_hint && (
            <div className="what-if-panel mt-16">
              <h4>Optimal Policy Hint</h4>
              <p className="text-sm mb-8"><strong>{data.optimal_policy_hint.name}</strong></p>
              <p className="text-sm text-muted mb-8">Conditions ({data.optimal_policy_hint.logic}):</p>
              {data.optimal_policy_hint.conditions.map((c, i) => (
                <div key={i} className="text-sm" style={{ padding: '4px 8px', background: '#fff', borderRadius: 4, marginBottom: 4 }}>
                  {c.type} <strong>{c.operator}</strong> "{c.value}"
                </div>
              ))}
              <p className="text-sm text-muted mt-8">Actions: {data.optimal_policy_hint.actions.join(', ')}</p>
            </div>
          )}

          {showWhatIf && whatIfResult && !whatIfResult.error && (
            <div className="what-if-panel mt-16">
              <h4>What-If Result</h4>
              <p className="text-sm mb-8">{whatIfResult.delta_summary}</p>
              <div className="grid-2">
                <div>
                  <span className="text-sm font-semibold">Original</span>
                  <div className={`alert ${whatIfResult.original_outcome?.score >= 50 ? 'alert-success' : 'alert-warning'} mt-8`} style={{ padding: '6px 10px' }}>
                    Score: {whatIfResult.original_outcome?.score}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold">Alternative</span>
                  <div className={`alert ${whatIfResult.alternative_outcome?.score >= 50 ? 'alert-success' : 'alert-warning'} mt-8`} style={{ padding: '6px 10px' }}>
                    Score: {whatIfResult.alternative_outcome?.score}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
