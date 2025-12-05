import React from 'react';
import { useParams } from 'react-router-dom';

import { useInstance } from 'src/domain/Instance/useInstanceQuery';
import { useDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useDataModelSchemaQuery } from 'src/features/datamodel/useDataModelSchemaQuery';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { GenericComponent } from 'src/layout/GenericComponent';
// import { useProcessQuery } from 'src/features/instance/useProcessQuery';

export const NextForm: React.FunctionComponent = () => {
  const { pageKey, taskId } = useParams();
  const layouts = useLayouts();
  const currentDataType = useLayoutSets().find((layoutSet) => layoutSet.tasks?.includes(taskId ?? ''));
  const instance = useInstance();

  if (!currentDataType) {
    throw new Error('currentDataType is required');
  }

  const currentDataObject = instance?.data.find((dataElement) => dataElement.dataType === currentDataType.dataType);

  if (!currentDataObject) {
    throw new Error('currentDataObject is required');
  }

  const url = useDataModelUrl({
    dataType: currentDataType.dataType,
    dataElementId: currentDataObject.id,
  });

  // debugger;

  const { data: formData, error: formDatError } = useFormDataQuery(url);

  console.log({ formData, formDatError });

  // const dataElementsToFetch = = instance.d

  console.log('instance', instance);

  const { data, error } = useDataModelSchemaQuery(true, currentDataType.dataType);

  console.log('data', data);

  // const textResources = useTextResources();
  // Do we have the data?
  if (!pageKey) {
    throw new Error('pageKey missing');
  }
  const currentPage = layouts[pageKey];
  if (!currentPage) {
    console.log(layouts);
    debugger;
    throw new Error('currentPage missing');
  }
  // return (
  //   <div>
  //     <pre>{JSON.stringify(formData, null, 2)}</pre>
  //   </div>
  // );
  return (
    <>
      {currentPage.map((component) => (
        <GenericComponent
          key={component.id}
          baseComponentId={component.id}
        />
      ))}
    </>
  );

  // return (
  //   <DataModelsProvider>
  //     <FormDataWriteProvider>
  //       <DynamicsProvider>
  //         <ValidationProvider>
  //           <NodesProvider
  //             readOnly={false}
  //             isEmbedded={false}
  //           >
  //             {currentPage.map((component) => (
  //               <GenericComponent
  //                 key={component.id}
  //                 baseComponentId={component.id}
  //               />
  //             ))}
  //           </NodesProvider>
  //         </ValidationProvider>
  //       </DynamicsProvider>
  //     </FormDataWriteProvider>
  //   </DataModelsProvider>
  // );
};
