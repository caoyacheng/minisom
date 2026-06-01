import { somModelType } from './som';
import type { ModelTypeDefinition, ModelTypeStatus } from './types';

const ALL: ModelTypeDefinition[] = [
  somModelType,
];

const byId = new Map(ALL.map((m) => [m.id, m]));

export function listModelTypes(filter?: { status?: ModelTypeStatus }): ModelTypeDefinition[] {
  if (!filter?.status) return ALL;
  return ALL.filter((m) => m.status === filter.status);
}

export function getModelType(id: string): ModelTypeDefinition | undefined {
  return byId.get(id);
}

/** 后端尚未返回 model_type 时，默认视为 SOM */
export function resolveModelTypeId(modelType?: string | null): string {
  if (modelType && byId.has(modelType)) return modelType;
  return 'som';
}

export function getModelTypeLabel(modelType?: string | null): string {
  const id = resolveModelTypeId(modelType);
  return getModelType(id)?.shortLabel ?? id;
}

export const DEFAULT_MODEL_TYPE_ID = somModelType.id;
