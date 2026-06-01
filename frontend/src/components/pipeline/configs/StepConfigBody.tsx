import { DatasetNodeConfig } from './DatasetNodeConfig';
import { DeployNodeConfig } from './DeployNodeConfig';
import { EvaluateNodeConfig } from './EvaluateNodeConfig';
import { MonitorNodeConfig } from './MonitorNodeConfig';
import { TrainNodeConfig } from './TrainNodeConfig';

export function StepConfigBody({ stepId }: { stepId: string }) {
  switch (stepId) {
    case 'datasets':
      return <DatasetNodeConfig />;
    case 'train':
      return <TrainNodeConfig />;
    case 'evaluate':
      return <EvaluateNodeConfig />;
    case 'deploy':
      return <DeployNodeConfig />;
    case 'monitor':
      return <MonitorNodeConfig />;
    default:
      return null;
  }
}
