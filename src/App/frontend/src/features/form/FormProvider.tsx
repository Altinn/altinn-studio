import React, { useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useGetCachedInitialValidations } from 'src/core/queries/backendValidation';
import { useIsStateless } from 'src/features/applicationMetadata';
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
import { createPageNavigationSlice } from 'src/features/form/layout/PageNavigationContext';
import { usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { FormDataWriteEffects } from 'src/features/formData/FormDataWrite';
import { useFormDataWriteProxies } from 'src/features/formData/FormDataWriteProxies';
import { createFormDataWriteSlice } from 'src/features/formData/FormDataWriteStateMachine';
import {
  useOptimisticallyUpdateCachedInstance,
  useSelectFromInstanceData,
} from 'src/features/instance/InstanceContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { createValidationSlice, ValidationEffects } from 'src/features/validation/validationContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { isAxiosError } from 'src/utils/isAxiosError';
import { createNodesSlice, NodesProvider } from 'src/utils/layout/NodesContext';
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
  const { error, bootstrap, enabled } = useBoostrapQuery(props);
  const previousBootstrap = useRef<FormBootstrapBase | null>(bootstrap);

  const dataSliceProps = useFormDataSliceProps(bootstrap);
  const storeRef = useRef<FormStoreApi | undefined>(undefined);

  if (enabled && bootstrap && dataSliceProps && (!storeRef.current || previousBootstrap.current !== bootstrap)) {
    // When the bootstrap query changes, or if it's the first render, we should wipe the store and restart. This usually
    // means we're moved to another task while keeping a similar enough render-tree to cause this to be re-used. The
    // layouts can change without all of this being reset, however.
    storeRef.current = createFormStore({ parent, readOnly, data: dataSliceProps, bootstrap });
    previousBootstrap.current = bootstrap;
  }

  useLayoutOverrides(storeRef);

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
      <ValidationEffects />
      <NodesProvider>
        <PaymentInformationProvider>
          <OrderDetailsProvider>
            <MaybePaymentProvider hasProcess={hasProcess}>{children}</MaybePaymentProvider>
          </OrderDetailsProvider>
        </PaymentInformationProvider>
      </NodesProvider>
    </FormStoreProvider>
  );
}

function MaybePaymentProvider({ children, hasProcess }: PropsWithChildren<{ hasProcess: boolean }>) {
  if (hasProcess) {
    return <PaymentProvider>{children}</PaymentProvider>;
  }

  return children;
}

function useHasProcess() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return !!(instanceOwnerPartyId && instanceGuid);
}

function useBoostrapQuery({ uiFolderOverride, dataElementIdOverride }: FormProviderProps) {
  const taskOverrides = useTaskOverrides();
  const folderNameFromUrl = useCurrentUiFolderNameFromUrl();
  const isStateless = useIsStateless();

  const uiFolder = uiFolderOverride ?? folderNameFromUrl ?? undefined;
  const dataElementId = dataElementIdOverride ?? taskOverrides.dataModelElementId ?? undefined;

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

  const bootstrap = useMemo<FormBootstrapBase | null>(
    () =>
      data && uiFolder
        ? {
            uiFolder,
            layouts: data.layouts,
            dataModels: data.dataModels,
            staticOptions: data.staticOptions,
            validationIssues: data.validationIssues,
            allInitialValidations: data.allInitialValidations,
          }
        : null,
    [data, uiFolder],
  );

  return { error, bootstrap, enabled };
}

function createFormStore({
  parent,
  data,
  readOnly,
  bootstrap,
}: {
  parent: FormStoreApi | undefined;
  data: FormDataSliceProps;
  readOnly: boolean;
  bootstrap: FormBootstrapBase;
}): FormStoreApi {
  return createStore<FormStoreState>()(
    immer((set: FormStoreSet) => ({
      parent,
      readOnly,
      data: createFormDataWriteSlice(data, set),
      validation: createValidationSlice(processBootstrap(bootstrap), set),
      nodes: createNodesSlice(set),
      pageNavigation: createPageNavigationSlice(set),
      bootstrap: createFormBootstrapSlice(bootstrap, set),
    })),
  );
}

export function useFormDataSliceProps(bootstrap: FormBootstrapBase | null): FormDataSliceProps | undefined {
  const proxies = useFormDataWriteProxies();
  const selectFromInstance = useSelectFromInstanceData();
  const autoSaveBehavior = usePageSettings().autoSaveBehavior;
  const changeInstance = useOptimisticallyUpdateCachedInstance();
  const getCachedInitialValidations = useGetCachedInitialValidations();

  if (!bootstrap) {
    return undefined;
  }

  return {
    dataModels: bootstrap.dataModels,
    autoSaving: !autoSaveBehavior || autoSaveBehavior === 'onChangeFormData',
    proxies,
    changeInstance,
    selectFromInstance,
    getCachedInitialValidations,
  };
}
