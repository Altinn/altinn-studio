import React from 'react';
import { useParams } from 'react-router-dom';

import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { ValidationProvider } from 'src/features/validation/validationContext';
import { GenericComponent } from 'src/layout/GenericComponent';
import { NodesProvider } from 'src/utils/layout/NodesContext';
// import { useProcessQuery } from 'src/features/instance/useProcessQuery';

export const NextForm: React.FunctionComponent = () => {
  const { pageKey } = useParams();
  // const process = useProcessQuery().data;
  const layouts = useLayouts();
  // const textResources = useTextResources();
  if (!pageKey) {
    throw new Error('pageKey missing');
  }
  const currentPage = layouts[pageKey];
  if (!currentPage) {
    throw new Error('currentPage missing');
  }

  return (
    <DataModelsProvider>
      <FormDataWriteProvider>
        <DynamicsProvider>
          <ValidationProvider>
            <NodesProvider
              readOnly={false}
              isEmbedded={false}
            >
              {currentPage.map((component) => (
                <GenericComponent
                  key={component.id}
                  baseComponentId={component.id}
                />
              ))}
            </NodesProvider>
          </ValidationProvider>
        </DynamicsProvider>
      </FormDataWriteProvider>
    </DataModelsProvider>
  );
};
