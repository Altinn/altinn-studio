import React from 'react';
import { useParams } from 'react-router-dom';

import { useLayouts } from 'src/http-client/api-client/queries/layouts';
import { RenderLayout } from 'src/next/RenderLayout';
import type { CompImageExternal } from 'src/layout/Image/config.generated';

// import { useLayouts } from 'src/http-client/api-client/queries/layouts';

// import { useProcessQuery } from 'src/features/instance/useProcessQuery';

export type PageParams = {
  pageKey: string;
  taskId: string;
};

export const NextForm: React.FunctionComponent = () => {
  const { pageKey, taskId } = useParams<PageParams>() as Required<PageParams>;

  const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
    layoutSet.tasks?.includes(taskId),
  );
  if (!currentLayoutSet) {
    throw new Error('something is wrong');
  }

  const layouts = useLayouts({ layoutSetId: currentLayoutSet.id });

  if (!layouts) {
    throw new Error('something is wrong layouts');
  }

  const currentLayout = layouts[pageKey];
  if (!currentLayout) {
    throw new Error('something is wrong components');
  }
  return (
    <div>
      <RenderLayout layout={currentLayout} />
    </div>
  );
};

// const lookupTextResource: Partial<ITextResource> = {};

const Image: React.FunctionComponent<CompImageExternal> = (props) => {
  const lang = window.AltinnAppGlobalData.userProfile.profileSettingPreference.language!;

  const chosenSrc = props.image?.src[lang];

  const src = chosenSrc ? chosenSrc : props.image?.src['nb'];
  // console.log('props', props);
  //
  // const lang = window.AltinnAppGlobalData.userProfile.profileSettingPreference.language;
  //
  // const textResourceBindings = useTextResources({ language: lang ?? 'nb' });
  // console.log('textResourceBindings', textResourceBindings);
  // // const text = props.textResourceBindings.;
  // const title = props.textResourceBindings?.title
  //   ? textResourceBindings?.resources.find((resource) => resource.id === props.textResourceBindings?.title)
  //   : props.textResourceBindings?.title;
  // console.log('title', title);
  //
  // console.log('applyTemplate(textResourceBindings)', applyTemplate(textResourceBindings));

  return src ? (
    <img
      src={src}
      alt=''
    />
  ) : (
    src
  );
};

// component;

// const { pageKey, taskId } = useParams();
// const layouts = useLayouts();
// const currentDataType = useLayoutSets().find((layoutSet) => layoutSet.tasks?.includes(taskId ?? ''));
// const instance = useInstance();
//
// if (!currentDataType) {
//   throw new Error('currentDataType is required');
// }
//
// const currentDataObject = instance?.data.find((dataElement) => dataElement.dataType === currentDataType.dataType);
//
// if (!currentDataObject) {
//   throw new Error('currentDataObject is required');
// }
//
// const url = useDataModelUrl({
//   dataType: currentDataType.dataType,
//   dataElementId: currentDataObject.id,
// });
//
// // debugger;
//
// const { data: formData, error: formDatError } = useFormDataQuery(url);
//
// console.log({ formData, formDatError });
//
// // const dataElementsToFetch = = instance.d
//
// console.log('instance', instance);
//
// const { data, error } = useDataModelSchemaQuery(true, currentDataType.dataType);
//
// console.log('data', data);
//
// // const textResources = useTextResources();
// // Do we have the data?
// if (!pageKey) {
//   throw new Error('pageKey missing');
// }
// const currentPage = layouts[pageKey];
// if (!currentPage) {
//   console.log(layouts);
//   debugger;
//   throw new Error('currentPage missing');
// }
// // return (
// //   <div>
// //     <pre>{JSON.stringify(formData, null, 2)}</pre>
// //   </div>
// // );
// return (
//   <>
//     {currentPage.map((component) => (
//       <GenericComponent
//         key={component.id}
//         baseComponentId={component.id}
//       />
//     ))}
//   </>

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
