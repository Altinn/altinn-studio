import { useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';
import type { StoreApi } from 'zustand';

import { useTextResourcesApi } from 'src/core/contexts/ApiProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { type ExternalApisResult, useExternalApiQueries } from 'src/core/queries/externalApi';
import { useCachedInstanceQueries } from 'src/core/queries/instance';
import { useQueryCacheObserver } from 'src/core/queries/queryCache';
import { useTextResourcesQueries } from 'src/core/queries/textResources';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { FormStore } from 'src/features/form/FormContext';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { resourcesAsMap } from 'src/features/language/textResources/TextResourcesProvider';
import { staticUseLanguage } from 'src/features/language/useLanguage';
import { useAllNavigationParams } from 'src/hooks/navigation';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { StaticOptionSet } from 'src/features/formBootstrap/types';
import type { DataModelReaders } from 'src/features/formData/FormDataReaders';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IApplicationSettings, IInstanceDataSources, IProcess } from 'src/types/shared';

/**
 * The coarse categories expression functions can read from.
 * A data source describes what kind of runtime state is being used, not a concrete lookup key.
 */
export type ExpressionDataSource =
  | 'applicationSettings'
  | 'currentLanguage'
  | 'currentPage'
  | 'displayValue'
  | 'externalApi'
  | 'formData'
  | 'instanceDataSources'
  | 'language'
  | 'layout'
  | 'options'
  | 'process';

/**
 * A concrete read that happened while evaluating an expression.
 * Dependencies are finer-grained than data sources, and are what the observer watches for future changes.
 */
export type ExpressionDependency =
  | { type: 'applicationSettings' }
  | { type: 'currentLanguage' }
  | { type: 'currentPage' }
  | { type: 'dataElementCount'; dataType: string }
  | { type: 'displayValue'; componentId: string }
  | { type: 'externalApi' }
  | { type: 'formData'; reference: IDataModelReference }
  | { type: 'instanceDataSources' }
  | { type: 'language'; dataModelPath: IDataModelReference | undefined }
  | { type: 'layout' }
  | { type: 'options'; optionsId: string }
  | { type: 'process' };

export interface ExpressionDataSources {
  currentDataModelPath: IDataModelReference | undefined;
  langToolsSelector: (dataModelPath: IDataModelReference | undefined) => IUseLanguage;
  track: (dependency: ExpressionDependency) => void;
  getDependencies: () => readonly ExpressionDependency[];
  context: {
    currentLanguage: () => string;
    currentPage: () => string | undefined;
    currentDataModelPath: () => IDataModelReference | undefined;
    assertDataSourceSupported: (dataSource: ExpressionDataSource) => void;
  };
  application: {
    getSettings: () => IApplicationSettings | null;
  };
  formData: {
    defaultDataType: () => string | undefined;
    hasDataType: (dataType: string) => boolean;
    read: (reference: IDataModelReference) => unknown;
  };
  layout: {
    getLookups: () => LayoutLookups | undefined;
  };
  options: {
    getStaticOptions: (optionsId: string) => StaticOptionSet['options'] | undefined;
  };
  instance: {
    countDataElements: (dataType: string) => number;
    getDataSources: () => IInstanceDataSources | null;
    getProcess: () => IProcess | undefined;
  };
  externalApi: {
    getAll: () => ExternalApisResult;
  };
  displayValue: {
    get: (componentId: string) => string | undefined;
  };
}

/**
 * Optional tweaks to a runtime instance.
 * This is mainly used to replace parts of the runtime in special contexts like subforms, or to forbid some
 * expression data sources entirely.
 */
export type RuntimeOverrides = {
  runtime?: Partial<ExpressionDataSources>;
  unsupportedDataSources?: Set<ExpressionDataSource>;
  errorSuffix?: string;
};

/**
 * The snapshot-backed inputs that the runtime reads from during one render.
 * These are intentionally broad and stable so runtime methods can stay synchronous and avoid mounting extra hooks.
 */
type SnapshotInputs = {
  applicationSettings: IApplicationSettings | null;
  currentLanguage: string;
  currentPage: string | undefined;
  currentDataModelPath: IDataModelReference | undefined;
  externalApiIds: string[];
  instanceId: string | undefined;
  store: StoreApi<FormStoreState> | typeof ContextNotProvided;
  textResourcesApi: ReturnType<typeof useTextResourcesApi>;
  dataModelReaders: DataModelReaders;
  instanceQueries: ReturnType<typeof useCachedInstanceQueries>;
  queryCacheObserver: ReturnType<typeof useQueryCacheObserver>;
  externalApiQueries: ReturnType<typeof useExternalApiQueries>;
  textResourceQueries: ReturnType<typeof useTextResourcesQueries>;
};

/**
 * Builds the expression runtime used by evalExpr().
 * Unlike the old hook-selection approach, this always evaluates against current snapshots and lets the observer
 * subscribe later only to the dependencies that were actually touched.
 */
export function useExpressionDataSources(toEvaluate: unknown, overrides?: RuntimeOverrides): ExpressionDataSources {
  const applicationSettings = useApplicationSettings();
  const currentLanguage = useCurrentLanguage();
  const { pageKey: currentPage, instanceOwnerPartyId, instanceGuid } = useAllNavigationParams();
  const currentDataModelPath = useCurrentDataModelLocation();
  const store = FormStore.raw.useLaxStore();
  const textResourcesApi = useTextResourcesApi();
  const dataModelReaders = useDataModelReaders();
  const instanceQueries = useCachedInstanceQueries();
  const queryCacheObserver = useQueryCacheObserver();
  const externalApiQueries = useExternalApiQueries();
  const textResourceQueries = useTextResourcesQueries();

  const displayValueLookups = useMemo(() => collectDisplayValueLookups(toEvaluate), [toEvaluate]);
  // Expression definitions are static for a mounted component. Avoid requiring FormStore in non-form expression
  // contexts when displayValue is not used.
  // eslint-disable-next-line react-compiler/react-compiler,react-hooks/rules-of-hooks
  const displayValues = displayValueLookups.length > 0 ? useDisplayDataFor(displayValueLookups) : emptyDisplayValues;

  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const observerRef = useRef<ExpressionObserver>(undefined);
  if (!observerRef.current) {
    observerRef.current = new ExpressionObserver(() => forceRender());
  }

  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
  const externalApiIds = getApplicationMetadata().externalApiIds ?? [];
  const inputs: SnapshotInputs = {
    applicationSettings,
    currentLanguage,
    currentPage,
    currentDataModelPath,
    externalApiIds,
    instanceId,
    store,
    textResourcesApi,
    dataModelReaders,
    instanceQueries,
    queryCacheObserver,
    externalApiQueries,
    textResourceQueries,
  };
  const collected = new Map<string, ExpressionDependency>();
  const track = (dependency: ExpressionDependency) => collected.set(makeDependencyKey(dependency), dependency);

  useLayoutEffect(() => {
    const observer = observerRef.current!;
    observer.commit(inputs, collected);
    return observer.subscribe();
  });

  const { runtime: runtimeOverrides, unsupportedDataSources, errorSuffix } = overrides ?? {};
  const assertDataSourceSupported = (dataSource: ExpressionDataSource) => {
    if (unsupportedDataSources?.has(dataSource)) {
      const message = `Expressions using data source "${dataSource}" are not supported in ${
        errorSuffix ? errorSuffix : 'this context'
      }.`;
      window.logErrorOnce(message);
      throw new Error(message);
    }
  };

  const output: ExpressionDataSources = {
    currentDataModelPath,
    langToolsSelector: (dataModelPath) => {
      track({ type: 'language', dataModelPath });
      return buildLanguageTools({ inputs, dataModelPath, track });
    },
    track,
    getDependencies: () => [...collected.values()],
    context: {
      currentLanguage: () => {
        track({ type: 'currentLanguage' });
        return currentLanguage;
      },
      currentPage: () => {
        track({ type: 'currentPage' });
        return currentPage;
      },
      currentDataModelPath: () => currentDataModelPath,
      assertDataSourceSupported,
    },
    application: {
      getSettings: () => {
        track({ type: 'applicationSettings' });
        return applicationSettings;
      },
    },
    formData: {
      defaultDataType: () => getDefaultDataTypeFromStore(store),
      hasDataType: (dataType) => getReadableDataTypesFromStore(store).includes(dataType),
      read: (reference) => {
        track({ type: 'formData', reference });
        return readFormDataFromStore(store, reference);
      },
    },
    layout: {
      getLookups: () => {
        assertDataSourceSupported('layout');
        track({ type: 'layout' });
        return getLayoutLookupsFromStore(store);
      },
    },
    options: {
      getStaticOptions: (optionsId) => {
        track({ type: 'options', optionsId });
        return getStaticOptionsFromStore(store, optionsId);
      },
    },
    instance: {
      countDataElements: (dataType) => {
        track({ type: 'dataElementCount', dataType });
        return instanceQueries.countDataElements(instanceId, dataType);
      },
      getDataSources: () => {
        track({ type: 'instanceDataSources' });
        return getInstanceDataSourcesFromCache(instanceQueries, instanceId);
      },
      getProcess: () => {
        track({ type: 'process' });
        return getProcessFromCache(instanceQueries, instanceId);
      },
    },
    externalApi: {
      getAll: () => {
        assertDataSourceSupported('externalApi');
        track({ type: 'externalApi' });
        externalApiQueries.ensureLoaded(instanceId, externalApiIds);
        return externalApiQueries.getCached(instanceId, externalApiIds);
      },
    },
    displayValue: {
      get: (componentId) => {
        assertDataSourceSupported('displayValue');
        track({ type: 'displayValue', componentId });
        return displayValues[componentId];
      },
    },
  };

  return useShallowMemo({ ...output, ...runtimeOverrides });
}

/**
 * Tracks which dependencies were touched during evaluation and decides when a rerender is needed.
 * It subscribes broadly to the store and query cache, but only compares the concrete dependencies that the
 * current expression actually used.
 */
class ExpressionObserver {
  private inputs?: SnapshotInputs;
  private active = new Map<string, ExpressionDependency>();
  private lastValues = new Map<string, unknown>();
  private unsubscribeStore?: (() => void) | null;
  private unsubscribeQuery?: (() => void) | null;

  constructor(private readonly onChange: () => void) {}

  commit(inputs: SnapshotInputs, dependencies: Map<string, ExpressionDependency>) {
    this.inputs = inputs;
    this.active = new Map(dependencies);
    this.lastValues = this.readValues(this.active);
  }

  subscribe() {
    this.unsubscribeStore?.();
    this.unsubscribeQuery?.();

    const inputs = this.inputs;
    if (!inputs) {
      return () => {};
    }

    this.unsubscribeStore =
      inputs.store !== ContextNotProvided
        ? inputs.store.subscribe(() => {
            this.checkForChanges();
          })
        : null;

    this.unsubscribeQuery = inputs.queryCacheObserver.subscribe(() => {
      this.checkForChanges();
    });

    return () => {
      this.unsubscribeStore?.();
      this.unsubscribeQuery?.();
      this.unsubscribeStore = null;
      this.unsubscribeQuery = null;
    };
  }

  private checkForChanges() {
    if (!this.inputs || this.active.size === 0) {
      return;
    }

    const nextValues = this.readValues(this.active);
    for (const [key, nextValue] of nextValues) {
      if (!deepEqual(this.lastValues.get(key), nextValue)) {
        this.lastValues = nextValues;
        this.onChange();
        return;
      }
    }
  }

  private readValues(dependencies: Map<string, ExpressionDependency>) {
    const values = new Map<string, unknown>();
    for (const [key, dependency] of dependencies) {
      values.set(key, readDependencyValue(this.inputs!, dependency));
    }
    return values;
  }
}

/**
 * Reads the current value for one tracked dependency from the latest snapshots.
 * This is the value the observer stores and compares over time to decide whether the expression should rerender.
 */
function readDependencyValue(inputs: SnapshotInputs, dependency: ExpressionDependency): unknown {
  switch (dependency.type) {
    case 'applicationSettings':
      return inputs.applicationSettings;
    case 'currentLanguage':
      return inputs.currentLanguage;
    case 'currentPage':
      return inputs.currentPage;
    case 'dataElementCount':
      return inputs.instanceQueries.countDataElements(inputs.instanceId, dependency.dataType);
    case 'displayValue':
      return dependency.componentId;
    case 'externalApi':
      return inputs.externalApiQueries.getCached(inputs.instanceId, inputs.externalApiIds);
    case 'formData':
      return readFormDataFromStore(inputs.store, dependency.reference);
    case 'instanceDataSources':
      return getInstanceDataSourcesFromCache(inputs.instanceQueries, inputs.instanceId);
    case 'language':
      return {
        currentLanguage: inputs.currentLanguage,
        textResources: getTextResourcesFromCache(inputs),
        instanceDataSources: getInstanceDataSourcesFromCache(inputs.instanceQueries, inputs.instanceId),
      };
    case 'layout':
      return getLayoutLookupsFromStore(inputs.store);
    case 'options':
      return getStaticOptionsFromStore(inputs.store, dependency.optionsId);
    case 'process':
      return getProcessFromCache(inputs.instanceQueries, inputs.instanceId);
  }
}

/**
 * Creates language helpers from snapshot state instead of from hook subscriptions.
 * This keeps text-related expression functions in the same sync runtime model as the rest of the expression engine.
 */
function buildLanguageTools({
  inputs,
  dataModelPath,
  track,
}: {
  inputs: SnapshotInputs;
  dataModelPath: IDataModelReference | undefined;
  track: (dependency: ExpressionDependency) => void;
}): IUseLanguage {
  ensureTextResourcesFetched(inputs);
  const textResources = getTextResourcesFromCache(inputs);

  return staticUseLanguage(textResources, null, inputs.currentLanguage, {
    applicationSettings: inputs.applicationSettings,
    instanceDataSources: getInstanceDataSourcesFromCache(inputs.instanceQueries, inputs.instanceId),
    customTextParameters: null,
    dataModelPath,
    dataModels: inputs.dataModelReaders,
    defaultDataType: getDefaultDataTypeFromStore(inputs.store),
    formDataTypes: getReadableDataTypesFromStore(inputs.store),
    formDataSelector: (reference) => {
      track({ type: 'formData', reference });
      return readFormDataFromStore(inputs.store, reference);
    },
  });
}

/** Read the default data type directly from the current FormStore snapshot. */
function getDefaultDataTypeFromStore(store: SnapshotInputs['store']) {
  if (store === ContextNotProvided) {
    return undefined;
  }
  return getUiFolderSettings(store.getState().bootstrap.uiFolder)?.defaultDataType;
}

/** Read the available data model types directly from the current FormStore snapshot. */
function getReadableDataTypesFromStore(store: SnapshotInputs['store']) {
  if (store === ContextNotProvided) {
    return [];
  }
  return Object.keys(store.getState().bootstrap.dataModels);
}

/** Read layout lookups directly from the current FormStore snapshot. */
function getLayoutLookupsFromStore(store: SnapshotInputs['store']) {
  if (store === ContextNotProvided) {
    return undefined;
  }
  return store.getState().bootstrap.layoutLookups;
}

/** Read a static options set directly from the current FormStore snapshot. */
function getStaticOptionsFromStore(store: SnapshotInputs['store'], optionsId: string) {
  if (store === ContextNotProvided) {
    return undefined;
  }
  return store.getState().bootstrap.staticOptions[optionsId]?.options;
}

/** Read one form-data value directly from the current FormStore snapshot. */
function readFormDataFromStore(store: SnapshotInputs['store'], reference: IDataModelReference) {
  if (store === ContextNotProvided) {
    return undefined;
  }
  return dot.pick(reference.field, store.getState().data.models[reference.dataType]?.debouncedCurrentData);
}

/** Derive expression-friendly instance data sources from the cached instance snapshot. */
function getInstanceDataSourcesFromCache(
  instanceQueries: SnapshotInputs['instanceQueries'],
  instanceId: string | undefined,
) {
  return buildInstanceDataSources(instanceQueries.getCachedInstance(instanceId));
}

/** Read the current process snapshot from the query cache, if present. */
function getProcessFromCache(instanceQueries: SnapshotInputs['instanceQueries'], instanceId: string | undefined) {
  return instanceQueries.getCachedInstance(instanceId)?.process;
}

/** Read text resources from the query cache, falling back to the initial window payload when possible. */
function getTextResourcesFromCache(inputs: SnapshotInputs): TextResourceMap {
  const cached = inputs.textResourceQueries.getCached(inputs.currentLanguage);
  if (cached) {
    return cached;
  }

  const fromWindow = window.altinnAppGlobalData.textResources;
  return fromWindow?.language === inputs.currentLanguage ? resourcesAsMap(fromWindow.resources) : {};
}

/** Start loading text resources into the cache when text-related expression functions touch that data source. */
function ensureTextResourcesFetched(inputs: SnapshotInputs) {
  inputs.textResourceQueries.ensureLoaded({
    selectedLanguage: inputs.currentLanguage,
    textResourcesFromWindow: window.altinnAppGlobalData.textResources,
    textResourcesApi: inputs.textResourcesApi,
  });
}

/**
 * Finds displayValue lookups up front.
 * displayValue is still a temporary exception because it depends on hook-based display-data implementations.
 */
function collectDisplayValueLookups(subject: unknown): string[] {
  const lookups = new Set<string>();
  collectDisplayValueLookupsInner(subject, lookups);
  return [...lookups.values()];
}

function collectDisplayValueLookupsInner(subject: unknown, lookups: Set<string>) {
  if (!subject || typeof subject !== 'object') {
    return;
  }

  if (Array.isArray(subject)) {
    if (subject[0] === 'displayValue' && typeof subject[1] === 'string') {
      lookups.add(subject[1]);
    }

    for (const item of subject) {
      collectDisplayValueLookupsInner(item, lookups);
    }
    return;
  }

  for (const key in subject) {
    collectDisplayValueLookupsInner(subject[key], lookups);
  }
}

/** Creates a stable key for deduplicating tracked dependencies. */
function makeDependencyKey(dependency: ExpressionDependency) {
  switch (dependency.type) {
    case 'formData':
      return `formData:${dependency.reference.dataType}:${dependency.reference.field}`;
    case 'displayValue':
      return `displayValue:${dependency.componentId}`;
    case 'dataElementCount':
      return `dataElementCount:${dependency.dataType}`;
    case 'options':
      return `options:${dependency.optionsId}`;
    case 'language':
      return `language:${dependency.dataModelPath?.dataType ?? ''}:${dependency.dataModelPath?.field ?? ''}`;
    default:
      return dependency.type;
  }
}

const emptyDisplayValues: Record<string, string | undefined> = {};
