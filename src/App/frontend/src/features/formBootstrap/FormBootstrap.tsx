import { useCallback, useMemo } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FormProviderHooks } from 'src/features/form/FormContext';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import type { IDataModelReference } from 'src/layout/common.generated';

export const FormBootstrap = {
  useLayouts: () => FormProviderHooks.useBootstrap().layouts,
  useLaxLayouts: () => FormProviderHooks.useLaxBootstrap()?.layouts,
  useLayoutLookups: () => FormProviderHooks.useBootstrap().layoutLookups,
  useHiddenLayoutsExpressions: () => FormProviderHooks.useBootstrap().hiddenLayoutsExpressions,
  useLaxHiddenLayoutsExpressions: () => FormProviderHooks.useLaxBootstrap()?.hiddenLayoutsExpressions,
  useExpandedWidthLayouts: () => FormProviderHooks.useBootstrap().expandedWidthLayouts,

  useDefaultDataType: () => {
    const uiFolder = FormProviderHooks.useBootstrap().uiFolder;
    return getUiFolderSettings(uiFolder)?.defaultDataType;
  },
  useLaxDefaultDataType: () => {
    const uiFolder = FormProviderHooks.useLaxBootstrap()?.uiFolder;
    return uiFolder ? getUiFolderSettings(uiFolder)?.defaultDataType : ContextNotProvided;
  },
  useReadableDataTypes: () => {
    const models = FormProviderHooks.useBootstrap().dataModels;
    return useMemo(() => Object.keys(models), [models]);
  },
  useLaxReadableDataTypes: () => {
    const models = FormProviderHooks.useLaxBootstrap()?.dataModels;
    return useMemo(() => (models ? Object.keys(models) : ContextNotProvided), [models]);
  },
  useWritableDataTypes: () => {
    const { dataModels } = FormProviderHooks.useBootstrap();
    return (
      useInstanceDataQuery({
        select: (instance) =>
          Object.keys(dataModels).filter((dataType) => {
            const elementId = dataModels[dataType]?.dataElementId;
            if (!elementId) {
              throw new Error(`Data element id not found for data type: ${dataType}`);
            }

            return instance.data.find((item) => item.id === elementId)?.locked !== true;
          }),
      }).data ?? Object.keys(dataModels)
    );
  },
  useDataModelSchema: (dataType: string) => FormProviderHooks.useBootstrap().dataModels[dataType]?.schemaResult,
  useSchemaLookup: () => {
    const dataModels = FormProviderHooks.useBootstrap().dataModels;
    return useMemo(
      () =>
        Object.fromEntries(
          Object.entries(dataModels).map(([dataType, dataModel]) => [dataType, dataModel.schemaResult.lookupTool]),
        ),
      [dataModels],
    );
  },
  useLookupBinding: () => {
    const { dataModels } = FormProviderHooks.useBootstrap();
    return useMemo(() => {
      if (Object.keys(dataModels).every((dataType) => dataModels[dataType])) {
        return (reference: IDataModelReference) =>
          dataModels[reference.dataType].schemaResult.lookupTool.getSchemaForPath(reference.field);
      }

      return undefined;
    }, [dataModels]);
  },
  useExpressionValidationConfig: (dataType: string) =>
    FormProviderHooks.useBootstrap().dataModels[dataType]?.expressionValidationConfig,

  useDataElementIdForDataType: (dataType: string) =>
    FormProviderHooks.useBootstrap().dataModels[dataType]?.dataElementId,
  useGetDataElementIdForDataType: () => {
    const dataModels = FormProviderHooks.useBootstrap().dataModels;
    return useCallback((dataType: string) => dataModels[dataType]?.dataElementId, [dataModels]);
  },
  useDataElementIds: () => {
    const dataModels = FormProviderHooks.useBootstrap().dataModels;
    return useMemo(
      () => Object.fromEntries(Object.entries(dataModels).map(([dataType, info]) => [dataType, info.dataElementId])),
      [dataModels],
    );
  },

  useStaticOptionsMap: () => FormProviderHooks.useBootstrap().staticOptions,
  useAllInitialValidationIssues: () => FormProviderHooks.useLaxBootstrap()?.allInitialValidations,
};
