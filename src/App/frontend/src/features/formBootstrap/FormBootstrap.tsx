import { useCallback, useMemo } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { FormStore } from 'src/features/form/FormContext';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import type { IDataModelReference } from 'src/layout/common.generated';

export const formBootstrapHooks = {
  useLayouts: () => FormStore.raw.useSelector((s) => s.bootstrap.processedLayouts),
  useLaxLayouts: () => {
    const out = FormStore.raw.useLaxSelector((s) => s.bootstrap.processedLayouts);
    return out === ContextNotProvided ? undefined : out;
  },
  useLayoutCollection: () => FormStore.raw.useSelector((s) => s.bootstrap.layoutLookups),
  useLayoutLookups: () => FormStore.raw.useSelector((s) => s.bootstrap.layoutLookups),
  useHiddenLayoutsExpressions: () => FormStore.raw.useSelector((s) => s.bootstrap.hiddenLayoutsExpressions),
  useLaxHiddenLayoutsExpressions: () => {
    const out = FormStore.raw.useLaxSelector((s) => s.bootstrap.hiddenLayoutsExpressions);
    return out === ContextNotProvided ? undefined : out;
  },
  useExpandedWidthLayouts: () => FormStore.raw.useSelector((s) => s.bootstrap.expandedWidthLayouts),
  useDataModels: () => FormStore.raw.useSelector((s) => s.bootstrap.dataModels),

  useDefaultDataType: () => {
    const uiFolder = FormStore.raw.useSelector((s) => s.bootstrap.uiFolder);
    return getUiFolderSettings(uiFolder)?.defaultDataType;
  },
  useLaxDefaultDataType: () => {
    const uiFolder = FormStore.raw.useLaxSelector((s) => s.bootstrap.uiFolder);
    return uiFolder === ContextNotProvided ? ContextNotProvided : getUiFolderSettings(uiFolder)?.defaultDataType;
  },
  useReadableDataTypes: () => {
    const models = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
    return useMemo(() => Object.keys(models), [models]);
  },
  useLaxReadableDataTypes: () => {
    const models = FormStore.raw.useLaxSelector((s) => s.bootstrap.dataModels);
    return useMemo(() => (models === ContextNotProvided ? ContextNotProvided : Object.keys(models)), [models]);
  },
  useWritableDataTypes: () => {
    const dataModels = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
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
  useSchemaLookup: () => {
    const dataModels = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
    return useMemo(
      () =>
        Object.fromEntries(
          Object.entries(dataModels).map(([dataType, dataModel]) => [dataType, dataModel.schemaResult.lookupTool]),
        ),
      [dataModels],
    );
  },
  useLookupBinding: () => {
    const dataModels = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
    return useMemo(() => {
      if (Object.keys(dataModels).every((dataType) => dataModels[dataType])) {
        return (reference: IDataModelReference) =>
          dataModels[reference.dataType].schemaResult.lookupTool.getSchemaForPath(reference.field);
      }

      return undefined;
    }, [dataModels]);
  },
  useGetDataElementIdForDataType: () => {
    const dataModels = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
    return useCallback((dataType: string) => dataModels[dataType]?.dataElementId, [dataModels]);
  },
  useDataElementIds: () => {
    const dataModels = FormStore.raw.useSelector((s) => s.bootstrap.dataModels);
    return useMemo(
      () => Object.fromEntries(Object.entries(dataModels).map(([dataType, info]) => [dataType, info.dataElementId])),
      [dataModels],
    );
  },

  useStaticOptionsMap: () => FormStore.raw.useSelector((s) => s.bootstrap.staticOptions),
  useAllInitialValidationIssues: () => {
    const out = FormStore.raw.useLaxSelector((s) => s.bootstrap.allInitialValidations);
    return out === ContextNotProvided ? undefined : out;
  },
};
