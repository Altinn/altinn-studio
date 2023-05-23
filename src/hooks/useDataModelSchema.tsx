import React, { useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { Draft07 } from 'json-schema-library';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCurrentDataTypeForApplication } from 'src/utils/appMetadata';
import { getRootElementPath } from 'src/utils/validation/validation';

function useDraft(enabled: boolean) {
  const dataModels = useAppSelector((state) => state.formDataModel.schemas);
  const currentDataModelName = useAppSelector((state) =>
    getCurrentDataTypeForApplication({
      application: state.applicationMetadata.applicationMetadata,
      instance: state.instanceData.instance,
      layoutSets: state.formLayout.layoutsets,
    }),
  );
  const currentModel =
    dataModels && currentDataModelName && currentDataModelName in dataModels && dataModels[currentDataModelName];

  if (!currentModel) {
    console.warn('Unable to read current data model schema');
    return undefined;
  }

  if (!enabled) {
    return undefined;
  }

  // The library does not seem to support 2019-09 and 2020-12 versions yet, and for all others it seems the
  // schema version is not usually specified. Also, ajv seems to default to Draft07, so we'll do that too.
  const rootPath = getRootElementPath(currentModel);
  const modelCopy = JSON.parse(JSON.stringify(currentModel));
  if (rootPath) {
    modelCopy.$ref = rootPath;
  }

  return new Draft07(currentModel);
}

const Context = React.createContext<Draft07 | undefined>(undefined);

export const DataModelSchemaContextWrapper = (props: PropsWithChildren) => {
  const devToolsHasBeenOpen = useAppSelector((state) => state.devTools.hasBeenOpen);
  const dataModelDraft = useDraft(devToolsHasBeenOpen);

  return <Context.Provider value={dataModelDraft}>{props.children}</Context.Provider>;
};

export const useDataModelSchema = () => useContext(Context);
