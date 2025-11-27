import React from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { BlockUntilAllLoaded, LoadingRegistryProvider } from 'src/core/loading/LoadingRegistry';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { CodeListsProvider } from 'src/features/options/CodeListsProvider';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { useNavigationParam } from 'src/hooks/navigation';
// import { FormPrefetcher } from 'src/queries/formPrefetcher';
import { NodesProvider } from 'src/utils/layout/NodesContext';

export interface FormContext {
  // Set this if this form context is provided somewhere it's not expected we should write data to the data model.
  // By setting this to true, no effects like 'preselectedOptionIndex' runs (which might try to change the data model).
  // This should always be set to true when summarizing a previous task. It's important to note that it doesn't
  // prevent any write operations from happening in case components inside try to write new form data, but it will
  // prevent automatic effects from happening.
  readOnly?: boolean;
}

const { Provider, useLaxCtx } = createContext<FormContext>({
  name: 'Form',
  required: true,
});

export function useIsInFormContext() {
  return useLaxCtx() !== ContextNotProvided;
}

/**
 * This helper-context provider is used to provide all the contexts needed for forms to work
 */
export function FormProvider({ children, readOnly = false }: React.PropsWithChildren<FormContext>) {
  const isEmbedded = useIsInFormContext();
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const hasProcess = !!(instanceOwnerPartyId && instanceGuid);

  return (
    <LoadingRegistryProvider>
      <CodeListsProvider>
        <DataModelsProvider>
          <LayoutSettingsProvider>
            <PageNavigationProvider>
              <DynamicsProvider>
                <FormDataWriteProvider>
                  <ValidationProvider>
                    <NodesProvider
                      readOnly={readOnly}
                      isEmbedded={isEmbedded}
                    >
                      <PaymentInformationProvider>
                        <OrderDetailsProvider>
                          <MaybePaymentProvider hasProcess={hasProcess}>
                            <Provider value={{ readOnly }}>
                              <BlockUntilAllLoaded>{children}</BlockUntilAllLoaded>
                            </Provider>
                          </MaybePaymentProvider>
                        </OrderDetailsProvider>
                      </PaymentInformationProvider>
                    </NodesProvider>
                  </ValidationProvider>
                </FormDataWriteProvider>
              </DynamicsProvider>
            </PageNavigationProvider>
          </LayoutSettingsProvider>
        </DataModelsProvider>
      </CodeListsProvider>
    </LoadingRegistryProvider>
  );
}

function MaybePaymentProvider({ children, hasProcess }: PropsWithChildren<{ hasProcess: boolean }>) {
  if (hasProcess) {
    return <PaymentProvider>{children}</PaymentProvider>;
  }

  return children;
}
