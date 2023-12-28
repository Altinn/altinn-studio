import { useMemo } from 'react';

import type { JSONSchema7 } from 'json-schema';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  useDataTypeByLayoutSetId,
  useIsStatelessApp,
} from 'src/features/applicationMetadata/appMetadataUtils';
import { useCurrentDataModelSchema } from 'src/features/datamodel/DataModelSchemaProvider';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { getRootElementPath } from 'src/utils/schemaUtils';
import {
  getAnonymousStatelessDataModelUrl,
  getDataElementUrl,
  getStatelessDataModelUrl,
} from 'src/utils/urls/appUrlHelper';
import type { IDataModelBindings } from 'src/layout/layout';

type AsSchema<T> = {
  [P in keyof T]: JSONSchema7 | null;
};

export function useCurrentDataModelGuid() {
  const instance = useLaxInstanceData();
  const process = useLaxProcessData();
  const application = useApplicationMetadata();
  const layoutSets = useLayoutSets();

  return getCurrentTaskDataElementId({ application, instance, process, layoutSets });
}

export function useCurrentDataModelUrl() {
  const isAnonymous = useAllowAnonymous();
  const instance = useLaxInstanceData();
  const layoutSetId = useCurrentLayoutSetId();
  const dataType = useDataTypeByLayoutSetId(layoutSetId);
  const dataElementUuid = useCurrentDataModelGuid();
  const isStateless = useIsStatelessApp();

  if (isStateless && isAnonymous && dataType) {
    return getAnonymousStatelessDataModelUrl(dataType);
  }

  if (isStateless && !isAnonymous && dataType) {
    return getStatelessDataModelUrl(dataType);
  }

  if (instance?.id && dataElementUuid) {
    return getDataElementUrl(instance.id, dataElementUuid);
  }

  return undefined;
}

export function useCurrentDataModelName() {
  const process = useLaxProcessData();
  const application = useApplicationMetadata();
  const layoutSets = useLayoutSets();
  return getCurrentDataTypeForApplication({
    application,
    process,
    layoutSets,
  });
}

export function useCurrentDataModelType() {
  const name = useCurrentDataModelName();
  const application = useApplicationMetadata();

  return application.dataTypes.find((dt) => dt.id === name);
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
