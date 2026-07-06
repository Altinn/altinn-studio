import { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

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
  markExpressionEvaluated: () => void;
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
export type ExpressionRuntimeOverrides = {
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
export function useExpressionDataSourcesBase(overrides?: ExpressionRuntimeOverrides): ExpressionDataSources {
  const unsupportedDataSources = useMemo(
    () => new Set([...(overrides?.unsupportedDataSources ?? []), 'displayValue' as const]),
    [overrides?.unsupportedDataSources],
  );

  return useExpressionDataSourcesRuntime(
    {
      ...overrides,
      unsupportedDataSources,
    },
    'runtime',
  );
}

export function useExpressionDataSourcesBaseForStoreSelector(
  overrides?: ExpressionRuntimeOverrides,
): ExpressionDataSources {
  const unsupportedDataSources = useMemo(
    () => new Set([...(overrides?.unsupportedDataSources ?? []), 'displayValue' as const]),
    [overrides?.unsupportedDataSources],
  );

  return useExpressionDataSourcesRuntime(
    {
      ...overrides,
      unsupportedDataSources,
    },
    'storeSelector',
  );
}

export function useExpressionDataSources(
  toEvaluate: unknown,
  overrides?: ExpressionRuntimeOverrides,
): ExpressionDataSources {
  if (overrides?.unsupportedDataSources?.has('displayValue')) {
    throw new Error('Use the expressionDataSourcesBase hook instead');
  }
  const displayValueLookups = useMemo(() => collectDisplayValueLookups(toEvaluate), [toEvaluate]);
  // eslint-disable-next-line react-compiler/react-compiler,react-hooks/rules-of-hooks
  const displayValues = displayValueLookups.length > 0 ? useDisplayDataFor(displayValueLookups) : emptyDisplayValues;
  const runtime = useExpressionDataSourcesRuntime(overrides, 'runtime');

  return useMemo<ExpressionDataSources>(
    () => ({
      ...runtime,
      displayValue: {
        get: (componentId) => {
          runtime.context.assertDataSourceSupported('displayValue');
          runtime.track({ type: 'displayValue', componentId });
          return displayValues[componentId];
        },
      },
    }),
    [displayValues, runtime],
  );
}

export function useExpressionDataSourcesForStoreSelector(
  toEvaluate: unknown,
  overrides?: ExpressionRuntimeOverrides,
): ExpressionDataSources {
  if (overrides?.unsupportedDataSources?.has('displayValue')) {
    throw new Error('Use the expressionDataSourcesBase hook instead');
  }
  const displayValueLookups = useMemo(() => collectDisplayValueLookups(toEvaluate), [toEvaluate]);
  // eslint-disable-next-line react-compiler/react-compiler,react-hooks/rules-of-hooks
  const displayValues = displayValueLookups.length > 0 ? useDisplayDataFor(displayValueLookups) : emptyDisplayValues;
  const runtime = useExpressionDataSourcesRuntime(overrides, 'storeSelector');

  return useMemo<ExpressionDataSources>(
    () => ({
      ...runtime,
      displayValue: {
        get: (componentId) => {
          runtime.context.assertDataSourceSupported('displayValue');
          runtime.track({ type: 'displayValue', componentId });
          return displayValues[componentId];
        },
      },
    }),
    [displayValues, runtime],
  );
}

type ExpressionSubscriptionOwner = 'runtime' | 'storeSelector';

function useExpressionDataSourcesRuntime(
  overrides: ExpressionRuntimeOverrides | undefined,
  subscriptionOwner: ExpressionSubscriptionOwner,
): ExpressionDataSources {
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

  const [runtimeRevision, forceRender] = useReducer((n: number) => n + 1, 0);
  const observerRef = useRef<ExpressionObserver>(undefined);
  if (!observerRef.current) {
    observerRef.current = new ExpressionObserver(() => forceRender());
  }

  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
  const externalApiIds = getApplicationMetadata().externalApiIds ?? emptyExternalApiIds;
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

  observerRef.current.updateInputs(inputs);
  observerRef.current.beginCollect();

  useLayoutEffect(() => {
    observerRef.current!.commitCollect();
  });

  useLayoutEffect(() => {
    const observer = observerRef.current!;
    return observer.subscribe(subscriptionOwner);
  }, [queryCacheObserver, store, subscriptionOwner]);

  const { runtime: runtimeOverridesFromProps, unsupportedDataSources, errorSuffix } = overrides ?? {};
  const runtimeOverrides = useShallowMemo(runtimeOverridesFromProps ?? emptyRuntimeOverrides);
  const assertDataSourceSupported = useCallback(
    (dataSource: ExpressionDataSource) => {
      if (unsupportedDataSources?.has(dataSource)) {
        const message = `Expressions using data source "${dataSource}" are not supported in ${
          errorSuffix ? errorSuffix : 'this context'
        }.`;
        window.logErrorOnce(message);
        throw new Error(message);
      }
    },
    [unsupportedDataSources, errorSuffix],
  );

  return useMemo<ExpressionDataSources>(
    () => ({
      currentDataModelPath,
      langToolsSelector: (dataModelPath) => {
        observerRef.current!.track({ type: 'language', dataModelPath });
        return buildLanguageTools({ inputs: observerRef.current!.getInputs(), dataModelPath });
      },
      markExpressionEvaluated: () => observerRef.current!.markEvaluated(),
      track: (dependency) => observerRef.current!.track(dependency),
      getDependencies: () => observerRef.current!.getDependencies(),
      context: {
        currentLanguage: () => {
          observerRef.current!.track({ type: 'currentLanguage' });
          return observerRef.current!.getInputs().currentLanguage;
        },
        currentPage: () => {
          observerRef.current!.track({ type: 'currentPage' });
          return observerRef.current!.getInputs().currentPage;
        },
        currentDataModelPath: () => observerRef.current!.getInputs().currentDataModelPath,
        assertDataSourceSupported,
      },
      application: {
        getSettings: () => {
          observerRef.current!.track({ type: 'applicationSettings' });
          return observerRef.current!.getInputs().applicationSettings;
        },
      },
      formData: {
        defaultDataType: () => getDefaultDataTypeFromStore(observerRef.current!.getInputs().store),
        hasDataType: (dataType) =>
          getReadableDataTypesFromStore(observerRef.current!.getInputs().store).includes(dataType),
        read: (reference) => {
          observerRef.current!.track({ type: 'formData', reference });
          return readFormDataFromStore(observerRef.current!.getInputs().store, reference);
        },
      },
      layout: {
        getLookups: () => {
          assertDataSourceSupported('layout');
          observerRef.current!.track({ type: 'layout' });
          return getLayoutLookupsFromStore(observerRef.current!.getInputs().store);
        },
      },
      options: {
        getStaticOptions: (optionsId) => {
          observerRef.current!.track({ type: 'options', optionsId });
          return getStaticOptionsFromStore(observerRef.current!.getInputs().store, optionsId);
        },
      },
      instance: {
        countDataElements: (dataType) => {
          const latest = observerRef.current!.getInputs();
          return latest.instanceQueries.countDataElements(latest.instanceId, dataType);
        },
        getDataSources: () => {
          observerRef.current!.track({ type: 'instanceDataSources' });
          const latest = observerRef.current!.getInputs();
          return getInstanceDataSourcesFromCache(latest.instanceQueries, latest.instanceId);
        },
        getProcess: () => {
          observerRef.current!.track({ type: 'process' });
          const latest = observerRef.current!.getInputs();
          return getProcessFromCache(latest.instanceQueries, latest.instanceId);
        },
      },
      externalApi: {
        getAll: () => {
          assertDataSourceSupported('externalApi');
          observerRef.current!.track({ type: 'externalApi' });
          const latest = observerRef.current!.getInputs();
          latest.externalApiQueries.ensureLoaded(latest.instanceId, latest.externalApiIds);
          return latest.externalApiQueries.getCached(latest.instanceId, latest.externalApiIds);
        },
      },
      displayValue: {
        get: (componentId) => {
          assertDataSourceSupported('displayValue');
          observerRef.current!.track({ type: 'displayValue', componentId });
          return undefined;
        },
      },
      ...runtimeOverrides,

      // Trick to make sure eslint/exhaustive-deps does not complain about runtimeRevision
      ...(runtimeRevision > Infinity ? { ...runtimeOverrides } : {}),
    }),
    [assertDataSourceSupported, currentDataModelPath, runtimeRevision, runtimeOverrides],
  );
}

/**
 * Tracks which dependencies were touched during evaluation and decides when a rerender is needed.
 * It subscribes broadly to the store and query cache, but only compares the concrete dependencies that the
 * current expression actually used.
 */
class ExpressionObserver {
  private inputs?: SnapshotInputs;
  private collected = new Map<string, ExpressionDependency>();
  private active = new Map<string, ExpressionDependency>();
  private lastValues = new Map<string, unknown>();
  private evaluatedDuringCollect = false;
  private unsubscribeStore?: (() => void) | null;
  private unsubscribeQuery?: (() => void) | null;
  private subscribed = false;
  private rerenderScheduled = false;

  constructor(private readonly onChange: () => void) {}

  updateInputs(inputs: SnapshotInputs) {
    this.inputs = inputs;
  }

  getInputs() {
    if (!this.inputs) {
      throw new Error('Expression observer inputs are not initialized');
    }
    return this.inputs;
  }

  beginCollect() {
    this.collected.clear();
    this.evaluatedDuringCollect = false;
  }

  markEvaluated() {
    this.evaluatedDuringCollect = true;
  }

  track(dependency: ExpressionDependency) {
    this.collected.set(makeDependencyKey(dependency), dependency);
  }

  commitCollect() {
    // The runtime hook starts a collection during render, but dependency collection is only meaningful if evalExpr()
    // actually ran in that same collection pass. If no expression ran, an empty collection only means "nothing was
    // evaluated now", not "the previous expression no longer depends on anything".
    if (!this.evaluatedDuringCollect) {
      return;
    }

    this.active = new Map(this.collected);
    this.lastValues = this.readValues(this.active);
  }

  getDependencies() {
    return [...this.active.values()];
  }

  subscribe(subscriptionOwner: ExpressionSubscriptionOwner) {
    this.unsubscribeStore?.();
    this.unsubscribeQuery?.();
    this.subscribed = false;

    const inputs = this.inputs;
    if (!inputs) {
      return () => {};
    }

    this.unsubscribeStore =
      subscriptionOwner === 'runtime' && inputs.store !== ContextNotProvided
        ? inputs.store.subscribe(() => this.checkForChanges(isStoreBackedDependency))
        : null;

    this.unsubscribeQuery = inputs.queryCacheObserver.subscribe(() => {
      this.checkForChanges(isQueryBackedDependency);
    });
    this.subscribed = true;

    return () => {
      this.subscribed = false;
      this.unsubscribeStore?.();
      this.unsubscribeQuery?.();
      this.unsubscribeStore = null;
      this.unsubscribeQuery = null;
    };
  }

  private checkForChanges(shouldCheck: (dependency: ExpressionDependency) => boolean) {
    if (!this.inputs || this.active.size === 0) {
      return;
    }

    const dependencies = new Map([...this.active].filter(([, dependency]) => shouldCheck(dependency)));
    if (dependencies.size === 0) {
      return;
    }

    const nextValues = this.readValues(dependencies);
    for (const [key, nextValue] of nextValues) {
      const previousValue = this.lastValues.get(key);
      if (!deepEqual(previousValue, nextValue)) {
        this.lastValues = new Map([...this.lastValues, ...nextValues]);
        this.scheduleRerender();
        return;
      }
    }
  }

  private scheduleRerender() {
    if (this.rerenderScheduled) {
      return;
    }

    this.rerenderScheduled = true;
    queueMicrotask(() => {
      this.rerenderScheduled = false;
      if (this.subscribed) {
        this.onChange();
      }
    });
  }

  private readValues(dependencies: Map<string, ExpressionDependency>) {
    const values = new Map<string, unknown>();
    for (const [key, dependency] of dependencies) {
      values.set(key, readDependencyValue(this.inputs!, dependency));
    }
    return values;
  }
}

function isStoreBackedDependency(dependency: ExpressionDependency) {
  return dependency.type === 'formData' || dependency.type === 'layout' || dependency.type === 'options';
}

function isQueryBackedDependency(dependency: ExpressionDependency) {
  return (
    dependency.type === 'externalApi' ||
    dependency.type === 'instanceDataSources' ||
    dependency.type === 'language' ||
    dependency.type === 'process'
  );
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
}: {
  inputs: SnapshotInputs;
  dataModelPath: IDataModelReference | undefined;
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
    formDataSelector: (reference) => readFormDataFromStore(inputs.store, reference),
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
    case 'options':
      return `options:${dependency.optionsId}`;
    case 'language':
      return `language:${dependency.dataModelPath?.dataType ?? ''}:${dependency.dataModelPath?.field ?? ''}`;
    default:
      return dependency.type;
  }
}

const emptyDisplayValues: Record<string, string | undefined> = {};
const emptyExternalApiIds: string[] = [];
const emptyRuntimeOverrides: Partial<ExpressionDataSources> = {};
