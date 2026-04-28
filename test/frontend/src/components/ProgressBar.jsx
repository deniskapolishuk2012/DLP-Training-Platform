const STAGE_NAMES = [
  'Data Creation',
  'Labeling',
  'SIT Detection',
  'Policy Eval',
  'Incident',
  'Analyst',
  'Compliance',
];

export default function ProgressBar({ currentStage, totalStages = 7, stageResults = [], onStageClick }) {
  return (
    <div className="stage-progress">
      {Array.from({ length: totalStages }, (_, i) => {
        const stageNum = i + 1;
        const result = stageResults.find((r) => r.stageNumber === stageNum);
        const isCompleted = !!result;
        const isActive = stageNum === currentStage;
        const hasError = result && result.score < 40;

        let dotClass = 'stage-dot';
        if (isActive) dotClass += ' active';
        else if (isCompleted && hasError) dotClass += ' error';
        else if (isCompleted) dotClass += ' completed';

        return (
          <div key={stageNum} className="stage-step">
            <div className="stage-step-wrapper">
              <div
                className={dotClass}
                onClick={() => isCompleted && onStageClick?.(stageNum)}
                title={STAGE_NAMES[i]}
              >
                {isCompleted ? (hasError ? '!' : '✓') : stageNum}
              </div>
              <div className={`stage-label${isActive ? ' active' : ''}`}>
                {STAGE_NAMES[i]}
              </div>
            </div>
            {stageNum < totalStages && (
              <div className={`stage-connector${isCompleted ? ' completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
