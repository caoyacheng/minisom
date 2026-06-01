import { Link } from 'react-router-dom';
import { WORKFLOW_STEPS } from '../navigation/routes';
import { Panel } from './ui';

interface Props {
  currentPath: string;
}

export function WorkflowStrip({ currentPath }: Props) {
  const activeIndex = WORKFLOW_STEPS.findIndex(
    (s) => currentPath === s.path || currentPath.startsWith(`${s.path}/`),
  );

  return (
    <nav className="workflow-strip" aria-label="建模工作流">
      {WORKFLOW_STEPS.map((step, i) => {
        const active = i === activeIndex;
        const done = activeIndex > i;
        return (
          <Link
            key={step.id}
            to={step.path}
            className={`workflow-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
          >
            <span className="workflow-step-num">{i + 1}</span>
            <span className="workflow-step-label">{step.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkflowGuide({ highlightPath }: { highlightPath?: string }) {
  return (
    <Panel title="建模工作流">
      <ol className="workflow-guide">
        {WORKFLOW_STEPS.map((step, i) => (
          <li
            key={step.id}
            className={highlightPath === step.path ? 'highlight' : undefined}
          >
            <Link to={step.path} className="workflow-guide-link">
              <span className="workflow-step-num">{i + 1}</span>
              <span>
                <strong>{step.label}</strong>
                <span className="muted" style={{ display: 'block', marginTop: 2 }}>
                  {step.desc}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
