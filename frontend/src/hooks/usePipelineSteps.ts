import { useEffect, useMemo, useState } from 'react';
import { api, type ModelRecord } from '../api/client';
import { computePipelineSteps } from '../components/pipeline/computePipelineSteps';
import type { PipelineStepStatus } from '../components/pipeline/types';
import { useAppContext } from '../context/AppContext';

export function usePipelineSteps() {
  const { trainDataset, trainJob, trainTraining, testResult } = useAppContext();

  const [models, setModels] = useState<ModelRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [datasetCount, setDatasetCount] = useState(0);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.listModels().then((res) => {
      setModels(res.models);
      setActiveId(res.active_model_id ?? null);
    }).catch(() => {});
    api.listDatasets().then((res) => {
      setDatasetCount(res.datasets.length);
    }).catch(() => {});
    api.health().then(() => setBackendOk(true)).catch(() => setBackendOk(false));
  }, []);

  const activeModel = models.find((m) => m.id === activeId || m.is_active);

  const steps: PipelineStepStatus[] = useMemo(
    () =>
      computePipelineSteps({
        datasetCount,
        trainDataset,
        trainJob,
        trainTraining,
        testResult,
        activeModel,
        modelCount: models.length,
        backendOk,
      }),
    [
      datasetCount,
      trainDataset,
      trainJob,
      trainTraining,
      testResult,
      activeModel,
      models.length,
      backendOk,
    ],
  );

  return {
    steps,
    models,
    activeModel,
    datasetCount,
    backendOk,
    trainDataset,
    trainJob,
    trainTraining,
    testResult,
  };
}
