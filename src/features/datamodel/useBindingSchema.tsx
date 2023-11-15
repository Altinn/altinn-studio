import { useMemo } from 'react';

import type { JSONSchema7 } from 'json-schema';

import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { IDataModelBindings } from 'src/layout/layout';

type AsSchema<T> = {
  [P in keyof T]: JSONSchema7 | null;
};

export function useCurrentDataModelGuid() {
  const instance = useLaxInstanceData();
  const process = useLaxProcessData();
  const application = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);

  return getCurrentTaskDataElementId({ application, instance, process, layoutSets });
}

export function useCurrentDataModelName() {
  const process = useLaxProcessData();
  const application = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  return getCurrentDataTypeForApplication({
    application,
    process,
    layoutSets,
  });
}

export function useCurrentDataModelSchema() {
  const dataModels = useAppSelector((state) => state.formDataModel.schemas);
  const currentDataModelName = useCurrentDataModelName();
  return useMemo(() => {
    if (dataModels && currentDataModelName && currentDataModelName in dataModels) {
      return dataModels[currentDataModelName];
    }

    return undefined;
  }, [dataModels, currentDataModelName]);
}

export function useCurrentDataModelType() {
  const name = useCurrentDataModelName();

  return useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.dataTypes.find((dt) => dt.id === name),
  );
}

export function useBindingSchema<T extends IDataModelBindings | undefined>(bindings: T): AsSchema<T> | undefined {
  const currentSchema = useCurrentDataModelSchema();
  const dataType = useCurrentDataModelType();

  return useMemo(() => {
    const resolvedBindings = bindings && Object.values(bindings).length ? { ...bindings } : undefined;
    if (resolvedBindings && currentSchema) {
      const rootElementPath = getRootElementPath(currentSchema, dataType);
      const out = {} as AsSchema<T>;
      for (const [key, _value] of Object.entries(resolvedBindings)) {
        const value = _value as string;
        const bindingPointer = dotNotationToPointer(value);

        const [schema] = lookupBindingInSchema({
          schema: currentSchema,
          rootElementPath,
          targetPointer: bindingPointer,
        });

        out[key] = schema || null;
      }

      return out;
    }

    return undefined;
  }, [currentSchema, bindings, dataType]);
}
