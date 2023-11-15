import React from 'react';

import { AttachmentsProvider } from 'src/features/attachments/AttachmentsContext';
import { CustomValidationConfigProvider } from 'src/features/customValidation/CustomValidationContext';
import { DataModelSchemaProvider } from 'src/features/datamodel/DataModelSchemaProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { FormDataProvider } from 'src/features/formData/FormDataContext';
import { AllOptionsProvider } from 'src/features/options/useAllOptions';

/**
 * This helper-context provider is used to provide all the contexts needed for forms to work
 */
export function FormProvider({ children }: React.PropsWithChildren) {
  return (
    <CustomValidationConfigProvider>
      <LayoutsProvider>
        <LayoutSettingsProvider>
          <FormDataProvider>
            <DataModelSchemaProvider>
              <AttachmentsProvider>
                <DynamicsProvider>
                  <RulesProvider>
                    <AllOptionsProvider>{children}</AllOptionsProvider>
                  </RulesProvider>
                </DynamicsProvider>
              </AttachmentsProvider>
            </DataModelSchemaProvider>
          </FormDataProvider>
        </LayoutSettingsProvider>
      </LayoutsProvider>
    </CustomValidationConfigProvider>
  );
}
