const BASE = '/api';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // End-to-End
  startEndToEnd: (data) => request('/start_end_to_end', { method: 'POST', body: JSON.stringify(data) }),
  submitStage: (stageNumber, data) => request(`/submit_stage/${stageNumber}`, { method: 'POST', body: JSON.stringify(data) }),
  getResult: (sessionId) => request(`/end_to_end_result/${sessionId}`),
  whatIfStage: (data) => request('/what_if_stage', { method: 'POST', body: JSON.stringify(data) }),
  getScenarios: () => request('/scenarios'),

  // Modules
  policyEvaluate: (data) => request('/modules/policy/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  policySimulate: (data) => request('/modules/policy/simulate', { method: 'POST', body: JSON.stringify(data) }),
  policyWhatIf: (data) => request('/modules/policy/what_if', { method: 'POST', body: JSON.stringify(data) }),
  getConditionTypes: () => request('/modules/policy/condition_types'),
  getPolicyActions: () => request('/modules/policy/actions'),

  incidentEvaluate: (data) => request('/modules/incident/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  getAnalystActions: () => request('/modules/incident/actions'),

  getLabels: () => request('/modules/labels'),
  evaluateLabel: (data) => request('/modules/labels/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  reverseLabel: (data) => request('/modules/labels/reverse', { method: 'POST', body: JSON.stringify(data) }),

  getSits: () => request('/modules/sits'),
  testSitDetection: (data) => request('/modules/sits/test', { method: 'POST', body: JSON.stringify(data) }),

  analyzeFP: (data) => request('/modules/fp/analyze', { method: 'POST', body: JSON.stringify(data) }),
  analyzeInsiderRisk: (data) => request('/modules/insider/analyze', { method: 'POST', body: JSON.stringify(data) }),

  complianceImpact: (data) => request('/modules/compliance/impact', { method: 'POST', body: JSON.stringify(data) }),
  generatePolicy: (data) => request('/modules/compliance/generate_policy', { method: 'POST', body: JSON.stringify(data) }),
};
