import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type {
  DatasetPreview,
  EvaluationResult,
  ModelRecord,
  TrainingConfig,
  TrainingJobStatus,
  Visualizations,
} from '../api/client';
import { api } from '../api/client';

const STORAGE_KEY = 'workbench-state';

export const defaultTrainingConfig = (
  datasetId: string,
  features: string[],
): TrainingConfig => ({
  model_type: 'som',
  dataset_id: datasetId,
  model_name: '默认模型',
  feature_columns: features,
  label_column: null,
  normalize: true,
  grid_x: 8,
  grid_y: 8,
  sigma: 1.0,
  learning_rate: 0.5,
  num_iterations: 100,
  topology: 'rectangular',
  neighborhood_function: 'gaussian',
  activation_distance: 'euclidean',
  training_mode: 'online',
  weight_init: 'pca',
  random_order: false,
  use_epochs: false,
});

interface PersistedState {
  trainDataset: DatasetPreview | null;
  trainConfig: TrainingConfig | null;
  trainJob: TrainingJobStatus | null;
  trainViz: Visualizations | null;
  trainTraining: boolean;
  trainError: string | null;
  testModelId: string;
  testDataset: DatasetPreview | null;
  testResult: EvaluationResult | null;
  testError: string | null;
}

const defaultPersisted: PersistedState = {
  trainDataset: null,
  trainConfig: null,
  trainJob: null,
  trainViz: null,
  trainTraining: false,
  trainError: null,
  testModelId: '',
  testDataset: null,
  testResult: null,
  testError: null,
};

function loadPersistedState(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted;
    return { ...defaultPersisted, ...JSON.parse(raw) };
  } catch {
    return defaultPersisted;
  }
}

interface AppContextValue {
  trainDataset: DatasetPreview | null;
  setTrainDataset: Dispatch<SetStateAction<DatasetPreview | null>>;
  trainConfig: TrainingConfig | null;
  setTrainConfig: Dispatch<SetStateAction<TrainingConfig | null>>;
  trainJob: TrainingJobStatus | null;
  setTrainJob: Dispatch<SetStateAction<TrainingJobStatus | null>>;
  trainViz: Visualizations | null;
  setTrainViz: Dispatch<SetStateAction<Visualizations | null>>;
  trainTraining: boolean;
  setTrainTraining: Dispatch<SetStateAction<boolean>>;
  trainError: string | null;
  setTrainError: Dispatch<SetStateAction<string | null>>;
  onTrainUploaded: (dataset: DatasetPreview) => void;
  testModelId: string;
  setTestModelId: Dispatch<SetStateAction<string>>;
  testDataset: DatasetPreview | null;
  setTestDataset: Dispatch<SetStateAction<DatasetPreview | null>>;
  testResult: EvaluationResult | null;
  setTestResult: Dispatch<SetStateAction<EvaluationResult | null>>;
  testError: string | null;
  setTestError: Dispatch<SetStateAction<string | null>>;
  testModels: ModelRecord[];
  setTestModels: Dispatch<SetStateAction<ModelRecord[]>>;
  clearTrainSession: () => void;
  clearTestSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const saved = loadPersistedState();

  const [trainDataset, setTrainDataset] = useState(saved.trainDataset);
  const [trainConfig, setTrainConfig] = useState(saved.trainConfig);
  const [trainJob, setTrainJob] = useState(saved.trainJob);
  const [trainViz, setTrainViz] = useState(saved.trainViz);
  const [trainTraining, setTrainTraining] = useState(saved.trainTraining);
  const [trainError, setTrainError] = useState(saved.trainError);

  const [testModelId, setTestModelId] = useState(saved.testModelId);
  const [testDataset, setTestDataset] = useState(saved.testDataset);
  const [testResult, setTestResult] = useState(saved.testResult);
  const [testError, setTestError] = useState(saved.testError);
  const [testModels, setTestModels] = useState<ModelRecord[]>([]);

  useEffect(() => {
    api.listModels().then((res) => {
      setTestModels(res.models);
      if (res.models.length) {
        setTestModelId((current) => {
          const stillValid = res.models.some((m) => m.id === current);
          return stillValid && current ? current : res.models[0].id;
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const payload: PersistedState = {
      trainDataset,
      trainConfig,
      trainJob,
      trainViz,
      trainTraining,
      trainError,
      testModelId,
      testDataset,
      testResult,
      testError,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    trainDataset,
    trainConfig,
    trainJob,
    trainViz,
    trainTraining,
    trainError,
    testModelId,
    testDataset,
    testResult,
    testError,
  ]);

  const onTrainUploaded = useCallback((dataset: DatasetPreview) => {
    setTrainDataset(dataset);
    setTrainConfig(
      defaultTrainingConfig(
        dataset.id,
        dataset.numeric_columns.length ? dataset.numeric_columns : dataset.columns,
      ),
    );
    setTrainJob(null);
    setTrainViz(null);
    setTrainError(null);
    setTrainTraining(false);
  }, []);

  const clearTrainSession = useCallback(() => {
    setTrainDataset(null);
    setTrainConfig(null);
    setTrainJob(null);
    setTrainViz(null);
    setTrainTraining(false);
    setTrainError(null);
  }, []);

  const clearTestSession = useCallback(() => {
    setTestDataset(null);
    setTestResult(null);
    setTestError(null);
  }, []);

  const value = useMemo(
    () => ({
      trainDataset,
      setTrainDataset,
      trainConfig,
      setTrainConfig,
      trainJob,
      setTrainJob,
      trainViz,
      setTrainViz,
      trainTraining,
      setTrainTraining,
      trainError,
      setTrainError,
      onTrainUploaded,
      testModelId,
      setTestModelId,
      testDataset,
      setTestDataset,
      testResult,
      setTestResult,
      testError,
      setTestError,
      testModels,
      setTestModels,
      clearTrainSession,
      clearTestSession,
    }),
    [
      trainDataset,
      trainConfig,
      trainJob,
      trainViz,
      trainTraining,
      trainError,
      onTrainUploaded,
      testModelId,
      testDataset,
      testResult,
      testError,
      testModels,
      clearTrainSession,
      clearTestSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
