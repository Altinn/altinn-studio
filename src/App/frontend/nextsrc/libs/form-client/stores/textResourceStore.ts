import { createStore } from 'zustand/vanilla';

import type { IApplicationSettings, ITextResource, IVariable } from 'src/types/shared';
import type { IRawTextResource, TextResourceMap } from 'src/features/language/textResources';

export interface TextResourceDataSources {
  formDataGetter: (path: string) => string | number | boolean | null;
  applicationSettings: IApplicationSettings | null;
  instanceDataSources: Record<string, string> | null;
  customTextParameters: Record<string, string> | null;
}

interface TextResourceState {
  resources: TextResourceMap;
  language: string;
}

interface TextResourceActions {
  setResources: (resources: IRawTextResource[]) => void;
  setLanguage: (language: string) => void;
}

export type TextResourceStore = TextResourceState & TextResourceActions;

export function resourcesToMap(resources: IRawTextResource[]): TextResourceMap {
  const map: TextResourceMap = {};
  for (const resource of resources) {
    map[resource.id] = { value: resource.value, variables: resource.variables };
  }
  return map;
}

export function resolveTextResource(
  key: string,
  resources: TextResourceMap,
  dataSources: TextResourceDataSources,
  visited = new Set<string>(),
): string {
  const textResource = resources[key];
  if (!textResource) {
    return key;
  }

  const value = textResource.variables
    ? replaceVariables(textResource.value, textResource.variables, dataSources)
    : textResource.value;

  if (value === key) {
    return value;
  }

  if (visited.has(value)) {
    return value;
  }
  visited.add(key);

  return resolveTextResource(value, resources, dataSources, visited);
}

function replaceVariables(
  text: string,
  variables: IVariable[],
  dataSources: TextResourceDataSources,
): string {
  const { formDataGetter, instanceDataSources, applicationSettings, customTextParameters } = dataSources;
  let out = text;

  for (const idx in variables) {
    const variable = variables[idx];
    let value = variable.key;

    if (variable.dataSource.startsWith('dataModel')) {
      const readValue = formDataGetter(value);
      if (readValue !== null && readValue !== undefined) {
        value = String(readValue);
      }
    } else if (variable.dataSource === 'instanceContext') {
      if (instanceDataSources && variable.key in instanceDataSources) {
        value = instanceDataSources[variable.key];
      }
    } else if (variable.dataSource === 'applicationSettings') {
      if (applicationSettings && variable.key in applicationSettings && applicationSettings[variable.key] !== undefined) {
        value = applicationSettings[variable.key]!;
      }
    } else if (variable.dataSource === 'customTextParameters') {
      value = customTextParameters?.[variable.key] ?? value;
    }

    if (value === variable.key) {
      value = variable.defaultValue ?? value;
    }

    out = out.replaceAll(`{${idx}}`, value);
  }

  return out;
}

export function createTextResourceStore(initial?: { resources?: IRawTextResource[]; language?: string }) {
  return createStore<TextResourceStore>()((set) => ({
    resources: initial?.resources ? resourcesToMap(initial.resources) : {},
    language: initial?.language ?? 'nb',
    setResources: (resources) => set({ resources: resourcesToMap(resources) }),
    setLanguage: (language) => set({ language }),
  }));
}
