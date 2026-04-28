import { createContext, useContext, useReducer } from 'react';

const SimulationContext = createContext(null);

const initialState = {
  sessionId: null,
  scenarioId: null,
  scenarioTitle: '',
  scenarioDescription: '',
  realityMode: false,
  currentStage: 0,
  totalStages: 7,
  stageData: null,
  stageResults: [],
  scorecard: null,
  status: 'idle', // idle | active | completed
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessionId: action.payload.session_id,
        scenarioId: action.payload.scenario_id,
        scenarioTitle: action.payload.scenario_title,
        scenarioDescription: action.payload.scenario_description,
        realityMode: action.payload.reality_mode,
        totalStages: action.payload.total_stages,
        currentStage: 1,
        stageData: action.payload.stage_1_data,
        stageResults: [],
        scorecard: null,
        status: 'active',
        loading: false,
        error: null,
      };
    case 'SUBMIT_STAGE':
      return { ...state, loading: true, error: null };
    case 'STAGE_RESULT': {
      const result = action.payload;
      return {
        ...state,
        loading: false,
        stageResults: [...state.stageResults, {
          stageNumber: result.stage_number,
          score: result.score,
          maxScore: result.max_score,
          feedback: result.feedback,
          computedResult: result.computed_result,
          cascadeEffects: result.cascade_effects,
        }],
        currentStage: result.is_final ? state.currentStage : state.currentStage + 1,
        stageData: result.is_final ? null : result.next_stage_data,
        status: result.is_final ? 'completed' : 'active',
      };
    }
    case 'SET_SCORECARD':
      return { ...state, scorecard: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'RESET':
      return { ...initialState };
    case 'GO_TO_STAGE':
      return { ...state, currentStage: action.payload };
    default:
      return state;
  }
}

export function SimulationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SimulationContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
