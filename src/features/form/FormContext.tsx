import React, { useRef } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { BlockUntilAllLoaded, LoadingRegistryProvider } from 'src/core/loading/LoadingRegistry';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { NavigateToNodeProvider } from 'src/features/form/layout/NavigateToNode';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { useHasProcessProvider } from 'src/features/instance/ProcessContext';
import { CodeListsProvider } from 'src/features/options/CodeListsProvider';
import { OrderDetailsProvider } from 'src/features/payment/OrderDetailsProvider';
import { PaymentInformationProvider } from 'src/features/payment/PaymentInformationProvider';
import { PaymentProvider } from 'src/features/payment/PaymentProvider';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { FormPrefetcher } from 'src/queries/formPrefetcher';
import { NodesProvider } from 'src/utils/layout/NodesContext';

const { Provider, useLaxCtx } = createContext<undefined>({
  name: 'Form',
  required: true,
});

export function useIsInFormContext() {
  return useLaxCtx() !== ContextNotProvided;
}

/**
 * This helper-context provider is used to provide all the contexts needed for forms to work
 */
export function FormProvider({ children }: React.PropsWithChildren) {
  const hasProcess = useHasProcessProvider();
  const renderCount = useRef(0);
  renderCount.current += 1;

  if (renderCount.current > 1) {
    console.error(
      `FormProvider re-rendered. This may cause all nodes to be re-created and may trash ` +
        `performance. Consider optimizing routes and components to avoid this.`,
    );
  }

  return (
    <Outer>
      {hasProcess ? (
        <PaymentProvider>
          <Inner>{children}</Inner>
        </PaymentProvider>
      ) : (
        <Inner>{children}</Inner>
      )}
    </Outer>
  );
}

function Outer({ children }: React.PropsWithChildren) {
  return (
    <LoadingRegistryProvider>
      <FormPrefetcher />
      <LayoutsProvider>
        <CodeListsProvider>
          <DataModelsProvider>
            <LayoutSettingsProvider>
              <PageNavigationProvider>
                <DynamicsProvider>
                  <RulesProvider>
                    <FormDataWriteProvider>
                      <ValidationProvider>
                        <NodesProvider>
                          <NavigateToNodeProvider>
                            <PaymentInformationProvider>
                              <OrderDetailsProvider>{children}</OrderDetailsProvider>
                            </PaymentInformationProvider>
                          </NavigateToNodeProvider>
                        </NodesProvider>
                      </ValidationProvider>
                    </FormDataWriteProvider>
                  </RulesProvider>
                </DynamicsProvider>
              </PageNavigationProvider>
            </LayoutSettingsProvider>
          </DataModelsProvider>
        </CodeListsProvider>
      </LayoutsProvider>
    </LoadingRegistryProvider>
  );
}

function Inner({ children }: React.PropsWithChildren) {
  return (
    <Provider value={undefined}>
      <BlockUntilAllLoaded>{children}</BlockUntilAllLoaded>
    </Provider>
  );
}
