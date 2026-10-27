import React, { useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useIsMutating } from 'src/core/queries/reactQuery';
import { useIsStateless } from 'src/features/applicationMetadata';
import { AttachmentEffects } from 'src/features/attachments/AttachmentEffects';
import { createAttachmentsSlice } from 'src/features/attachments/AttachmentsStore';
import { UpdateAttachmentsForCypress } from 'src/features/attachments/UpdateAttachmentsForCypress';
import { useExpressionDataSourcesBaseForStoreSelector } from 'src/features/expressions/runtime/useExpressionDataSources';
import { UpdateDataElementIdsForCypress } from 'src/features/form/DataElementIdsForCypress';
import {
  createFormBootstrapSlice,
  FormStore,
  type FormStoreApi,
  FormStoreProvider,
  type FormStoreSet,
  type FormStoreState,
  getRootFormStore,
  processBootstrap,
} from 'src/features/form/FormContext';
import { getPrefillFromSessionStorage } from 'src/features/form/getPrefillFromSessionStorage';
import { useLayoutOverrides } from 'src/features/form/layout/layoutOverrides';
import {
  ClearHiddenSummaryReturnState,
  createPageNavigationSlice,
} from 'src/features/form/layout/PageNavigationContext';
import { usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { TaskTransitionBoundary } from 'src/features/form/TaskTransitionBoundary';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { FormDataWriteEffects } from 'src/features/formData/FormDataWrite';
import { useFormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import { createFormDataWriteSlice } from 'src/features/formData/FormDataWriteStateMachine';
import {
  useInstanceDataQuery,
  useOptimisticallyUpdateCachedInstance,
  useSelectFromInstanceData,
} from 'src/features/instance/InstanceContext';
import { getProcessNextMutationKey, PROCESS_RESUME_MUTATION_KEY } from 'src/features/instance/processNextMutationKey';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { RunOptionsEffects } from 'src/features/options/RunOptionsEffects';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { createValidationSlice, ValidationEffects } from 'src/features/validation/validationContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ELEMENT_TYPE } from 'src/types/shared';
import { isAxiosError } from 'src/utils/isAxiosError';
import { createLayoutDiagnosticsSlice } from 'src/utils/layout/LayoutDiagnostics';
import { LayoutPropertiesValidation } from 'src/utils/layout/validation/LayoutPropertiesValidation';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { FormBootstrapBase } from 'src/features/formBootstrap/types';
import type { FormDataSliceProps } from 'src/features/formData/FormDataWrite';

interface FormProviderProps {
  uiFolderOverride?: string;
  dataElementIdOverride?: string;
  readOnly?: boolean;
}

/**
 * This helper-context provider is used to provide all the contexts needed for forms to work
 */
export function FormProvider({ children, readOnly = false, ...props }: React.PropsWithChildren<FormProviderProps>) {
  const parentFromContext = FormStore.raw.useLaxStore();
  const parent = parentFromContext === ContextNotProvided ? undefined : parentFromContext;
  const hasProcess = useHasProcess();
  const isPdfOfOtherTask = useIsPdfOfOtherTask();
  const transitioning = useIsInstanceTransitioning();
  const { error, bootstrap, enabled } = useBootstrapQuery(props);
  const previousBootstrap = useRef<FormBootstrapBase | null>(bootstrap);

  const dataSliceProps = useFormDataSliceProps(bootstrap, isPdfOfOtherTask);
  const storeRef = useRef<FormStoreApi | undefined>(undefined);

  if (enabled && bootstrap && dataSliceProps && (!storeRef.current || previousBootstrap.current !== bootstrap)) {
    // When the bootstrap query changes, or if it's the first render, we should wipe the store and restart. This usually
    // means we're moved to another task while keeping a similar enough render-tree to cause this to be re-used. The
    // layouts can change without all of this being reset, however.
    storeRef.current = createFormStore({
      parent,
      readOnly: readOnly || isPdfOfOtherTask,
      transitioning,
      data: dataSliceProps,
      bootstrap,
    });
    previousBootstrap.current = bootstrap;
  }

  useLayoutOverrides(storeRef);

  const store = storeRef.current;
  useEffect(() => {
    store?.setState({ transitioning });
  }, [store, transitioning]);

  useEffect(() => {
    // This injects validations for subform data elements into the top-most form store. They are maintained by
    // the top-most FormProvider running <BackendValidations /> which also updates when subform validations change.
    // This is needed for the top-form to be able to indicate subforms with errors.
    if (parent && bootstrap && props.dataElementIdOverride !== undefined) {
      for (const model of Object.values(bootstrap.dataModels)) {
        if (model.dataElementId === props.dataElementIdOverride && model.initialValidationIssues) {
          getRootFormStore(parent)
            .getState()
            .validation.setOtherDataElementBackendValidations(model.dataElementId, model.initialValidationIssues);
        }
      }
    }
  }, [bootstrap, parent, props.dataElementIdOverride]);

  if (!enabled) {
    // No point in trying to render a form here, but this can still happen when FormProvider is applied for all tasks
    // without actually checking the task type (such as in src/index.tsx). Only data-tasks, subforms, custom receipt and
    // stateless can render forms.
    return children;
  }

  if (error) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error} />;
  }

  if (!bootstrap || !dataSliceProps) {
    return <Loader reason='bootstrap-form' />;
  }

  return (
    <FormStoreProvider value={storeRef.current!}>
      {window.Cypress && <UpdateDataElementIdsForCypress />}
      <FormDataWriteEffects />
      <LayoutRevisionBoundary>
        <LayoutPropertiesValidation>
          <TaskTransitionBoundary>
            <ClearHiddenSummaryReturnState />
            <RunOptionsEffects />
            {window.Cypress && <UpdateAttachmentsForCypress />}
            <AttachmentEffects />
            <ValidationEffects />
            <PaymentInformationProvider>
              <OrderDetailsProvider>
                <MaybePaymentProvider hasProcess={hasProcess}>{children}</MaybePaymentProvider>
              </OrderDetailsProvider>
            </PaymentInformationProvider>
          </TaskTransitionBoundary>
        </LayoutPropertiesValidation>
      </LayoutRevisionBoundary>
    </FormStoreProvider>
  );
}

function LayoutRevisionBoundary({ children }: PropsWithChildren) {
  const layoutRevision = useLayoutRevisionKey();
  return <React.Fragment key={layoutRevision}>{children}</React.Fragment>;
}

const layoutRevisionKeys = new WeakMap<object, number>();
let nextLayoutRevisionKey = 0;

function useLayoutRevisionKey() {
  const layouts = FormStore.bootstrap.useLayouts();
  return useMemo(() => {
    let key = layoutRevisionKeys.get(layouts);
    if (key === undefined) {
      key = nextLayoutRevisionKey++;
      layoutRevisionKeys.set(layouts, key);
    }
    return key;
  }, [layouts]);
}

function MaybePaymentProvider({ children, hasProcess }: PropsWithChildren<{ hasProcess: boolean }>) {
  if (hasProcess) {
    return <PaymentProvider>{children}</PaymentProvider>;
  }

  return children;
}

/**
 * A PDF can render a task other than the current one, such as a preview of a later PDF service task. That task's
 * layouts must not change the current task's form data, so its form is read-only and its data is locked, as the
 * current task's data will be when that task runs.
 */
function useIsPdfOfOtherTask(): boolean {
  const isPdf = useIsPdf();
  const taskId = useNavigationParam('taskId');
  const currentTaskId = useProcessQuery().data?.currentTask?.elementId;
  return isPdf && taskId !== undefined && currentTaskId !== undefined && taskId !== currentTaskId;
}

/**
 * The instance is transitioning while a workflow is processing it, or while this session's process/resume is pending.
 * A pending process/next only counts once the process has moved past the task on screen, as between two chained
 * workflows: before that, the form is still being validated and saved for the request. A failed workflow is not
 * transitioning: the instance is not locked then, and the retry page replaces the task's pages.
 *
 * A service task's own page is always transitioning, also while its workflow is idle, such as between two chained
 * workflows or while the task waits for an outcome. The task owns the instance until the process moves on, and if it
 * fails for good, the retry page replaces its page.
 */
function useIsInstanceTransitioning(): boolean {
  const isPdf = useIsPdf();
  const taskId = useNavigationParam('taskId');
  const process = useProcessQuery().data;
  const isProcessNextPending = useIsMutating({ mutationKey: getProcessNextMutationKey(), status: 'pending' }) > 0;
  const isProcessResumePending = useIsMutating({ mutationKey: PROCESS_RESUME_MUTATION_KEY, status: 'pending' }) > 0;
  if (isPdf) {
    return false;
  }

  const isServiceTaskPage =
    taskId !== undefined &&
    [...(process?.processTasks ?? []), process?.currentTask].some(
      (task) => task?.elementId === taskId && task.elementType === ELEMENT_TYPE.SERVICE_TASK,
    );
  const processHasMovedOn = process !== undefined && process.currentTask?.elementId !== taskId;
  return (
    isServiceTaskPage ||
    process?.workflow?.status === 'processing' ||
    isProcessResumePending ||
    (isProcessNextPending && processHasMovedOn)
  );
}

/**
 * A subform PDF service task renders its subform through its own UI folder, which uses the subform data type. There
 * is one such data element per subform, so loading that folder needs the id of the subform being rendered.
 */
function usePdfSubformDataElementId(uiFolder: string | undefined): string | undefined {
  const isPdf = useIsPdf();
  const dataElementId = useNavigationParam('dataElementId');
  const dataType = useInstanceDataQuery({
    select: (instance) => instance.data.find((element) => element.id === dataElementId)?.dataType,
  }).data;

  const isSubformOfFolder = dataType !== undefined && dataType === getUiFolderSettings(uiFolder)?.defaultDataType;
  return isPdf && isSubformOfFolder ? dataElementId : undefined;
}

function useHasProcess() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return !!(instanceOwnerPartyId && instanceGuid);
}

function useBootstrapQuery({ uiFolderOverride, dataElementIdOverride }: FormProviderProps) {
  const taskOverrides = useTaskOverrides();
  const folderNameFromUrl = useCurrentUiFolderNameFromUrl();
  const isStateless = useIsStateless();

  const uiFolder = uiFolderOverride ?? folderNameFromUrl ?? undefined;
  const pdfSubformDataElementId = usePdfSubformDataElementId(uiFolder);
  const dataElementId = dataElementIdOverride ?? taskOverrides.dataModelElementId ?? pdfSubformDataElementId;

  const prefillRef = useRef<string | undefined>(
    isStateless && uiFolder ? getPrefillFromSessionStorage(uiFolder) : undefined,
  );
  const prefill = prefillRef.current;

  const folderSettings = getUiFolderSettings(uiFolder);
  const enabled = Boolean(uiFolder) && Boolean(folderSettings) && Boolean(folderSettings?.defaultDataType);

  const { data, error } = useFormBootstrapQuery({ enabled, uiFolder, dataElementId, prefill });

  useEffect(() => {
    if (data && prefill) {
      sessionStorage.removeItem('queryParams');
    }
  }, [data, prefill]);

  const bootstrap = useMemo<FormBootstrapBase | null>(() => {
    const defaultDataType = folderSettings?.defaultDataType;
    if (!data || !uiFolder || !defaultDataType) {
      return null;
    }
    return {
      uiFolder,
      defaultDataType,
      layouts: data.layouts,
      dataModels: data.dataModels,
      staticOptions: data.staticOptions,
      validationIssues: data.validationIssues,
      allInitialValidations: data.allInitialValidations,
    };
  }, [data, uiFolder, folderSettings]);

  if (uiFolder && folderSettings && !folderSettings.defaultDataType) {
    throw new Error(`Expected defaultDataType to be defined for uiFolder: ${uiFolder}`);
  }

  return { error, bootstrap, enabled };
}

function createFormStore({
  parent,
  data,
  readOnly,
  transitioning,
  bootstrap,
}: {
  parent: FormStoreApi | undefined;
  data: FormDataSliceProps;
  readOnly: boolean;
  transitioning: boolean;
  bootstrap: FormBootstrapBase;
}): FormStoreApi {
  const store = createStore<FormStoreState>()(
    immer((set: FormStoreSet) => ({
      parent,
      nestedFormStatus: { unsaved: 0, unloadWarnings: 0 },
      readOnly,
      transitioning,
      data: createFormDataWriteSlice(data, set),
      attachments: createAttachmentsSlice(set),
      validation: createValidationSlice(processBootstrap(bootstrap), set),
      layoutDiagnostics: createLayoutDiagnosticsSlice(set),
      pageNavigation: createPageNavigationSlice(set),
      bootstrap: createFormBootstrapSlice(bootstrap, set),
    })),
  );
  store.getState().data.debounce('forced');
  return store;
}

export function useFormDataSliceProps(
  bootstrap: FormBootstrapBase | null,
  locked: boolean,
): FormDataSliceProps | undefined {
  const proxies = useFormDataWriteProxies();
  const selectFromInstance = useSelectFromInstanceData();
  const autoSaveBehavior = usePageSettings().autoSaveBehavior;
  const changeInstance = useOptimisticallyUpdateCachedInstance();
  const calculationDataSources = useAsRef(useExpressionDataSourcesBaseForStoreSelector());

  if (!bootstrap) {
    return undefined;
  }

  return {
    dataModels: bootstrap.dataModels,
    autoSaving: !autoSaveBehavior || autoSaveBehavior === 'onChangeFormData',
    locked,
    proxies,
    changeInstance,
    selectFromInstance,
    getCalculationDataSources: () => calculationDataSources.current,
  };
}
