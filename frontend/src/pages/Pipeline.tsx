import { PipelineFlow } from '../components/PipelineFlow';
import { usePipelineSteps } from '../hooks/usePipelineSteps';

export default function Pipeline() {
  const { steps } = usePipelineSteps();

  return (
    <div className="pipeline-canvas">
      <PipelineFlow steps={steps} />
    </div>
  );
}
