import React from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { BlockUntilAllLoaded, LoadingRegistryProvider } from 'src/core/loading/LoadingRegistry';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { CodeListsProvider } from 'src/features/options/CodeListsProvider';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { FormPrefetcher } from 'src/queries/formPrefetcher';
import { NodesProvider } from 'src/utils/layout/NodesContext';

export interface FormContext {
  // Suppress automatic component effects and prevent writes to form data.
  // Use this when rendering a summary or an immutable PDF preview.
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
export function FormProvider({ children, readOnly: ownReadOnly = false }: React.PropsWithChildren<FormContext>) {
  const parent = useLaxCtx();
  const isEmbedded = parent !== ContextNotProvided;
  // Embedded subforms must preserve a read-only summary or preview context.
  const readOnly = ownReadOnly || (parent !== ContextNotProvided && parent.readOnly === true);
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const hasProcess = !!(instanceOwnerPartyId && instanceGuid);

  return (
    <LoadingRegistryProvider>
      <FormPrefetcher />
      <LayoutsProvider>
        <CodeListsProvider>
          <DataModelsProvider>
            <LayoutSettingsProvider>
              <PageNavigationProvider>
                <DynamicsProvider>
                  <MaybeRulesProvider isEmbedded={isEmbedded}>
                    <FormDataWriteProvider readOnly={readOnly}>
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
                  </MaybeRulesProvider>
                </DynamicsProvider>
              </PageNavigationProvider>
            </LayoutSettingsProvider>
          </DataModelsProvider>
        </CodeListsProvider>
      </LayoutsProvider>
    </LoadingRegistryProvider>
  );
}

function MaybePaymentProvider({ children, hasProcess }: PropsWithChildren<{ hasProcess: boolean }>) {
  if (hasProcess) {
    return <PaymentProvider>{children}</PaymentProvider>;
  }

  return children;
}

function MaybeRulesProvider({ children, isEmbedded }: PropsWithChildren<{ isEmbedded: boolean }>) {
  if (isEmbedded) {
    // The RulesProvider will overwrite a script tag in the body with custom global rules. If we did this in an
    // embedded form, we might overwrite rules for the parent FormProvider, thus affecting/damaging the parent form.
    return children;
  }

  return <RulesProvider>{children}</RulesProvider>;
}
