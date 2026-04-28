# DLP Training Platform v2.0 — End-to-End Edition

A comprehensive Microsoft Purview DLP training platform with hands-on simulation modules and a flagship **End-to-End DLP Simulation** that flows through the complete lifecycle.

## Quick Start

### Backend (Python/FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000` with API proxy to `http://localhost:8000`.

## Modules

| Module | Description |
|--------|-------------|
| **End-to-End Simulation** | Flagship 7-stage lifecycle simulation with cascading consequences |
| Policy Simulator | AND/OR rule builder, multi-scenario simulation, TP/FP/FN/TN metrics, What-If |
| Incident Simulator | DLP incident triage with analyst decisions and justification |
| Label Lab | Sensitivity label assignment with Reverse Mode |
| SIT Builder | Sensitive Information Type detection with Precision/Recall |
| False Positive Lab | FP pattern analysis with AI optimization suggestions |
| Insider Risk | Behavioral timeline and cumulative risk scoring |
| Compliance Lab | Regulatory impact engine with Preventive Policy Generator |

## End-to-End Simulation Stages

1. **Data Creation** — Examine file content, identify data types
2. **Label Assignment** — Assign sensitivity labels (integrates Label Lab)
3. **SIT Detection** — Select SITs to detect (integrates SIT Builder)
4. **Policy Evaluation** — Build DLP policy with conditions/actions (integrates Policy Simulator)
5. **Incident Creation** — Review generated incident (integrates Incident Simulator)
6. **Analyst Decision** — Make triage decision with justification + insider risk signals
7. **Compliance Impact** — Full regulatory impact with Preventive Policy Generator

## API Endpoints

- `POST /api/start_end_to_end` — Start a new simulation session
- `POST /api/submit_stage/{number}` — Submit choices for a stage
- `GET /api/end_to_end_result/{id}` — Get full results with scorecard
- `POST /api/what_if_stage` — What-If analysis for any stage
- `GET /api/scenarios` — List available scenarios
