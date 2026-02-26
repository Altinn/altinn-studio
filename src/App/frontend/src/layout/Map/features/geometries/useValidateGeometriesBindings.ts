import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';

export function useValidateGeometriesBindings(baseComponentId: string, bindings: IDataModelBindings<'Map'>) {
  const { geometries, geometryLabel, geometryData } = bindings ?? {};
  const lookupBinding = DataModels.useLookupBinding();
  const layoutLookups = useLayoutLookups();

  const errors: string[] = [];
  if (!geometries) {
    return errors;
  }

  const [groupErrors, geometriesResult] = validateDataModelBindingsAny(
    baseComponentId,
    bindings,
    lookupBinding,
    layoutLookups,
    'geometries',
    ['array'],
    false,
  );
  errors.push(...(groupErrors || []));

  // Validate that the geometries array contains objects
  if (
    geometriesResult &&
    (!geometriesResult.items ||
      typeof geometriesResult.items !== 'object' ||
      Array.isArray(geometriesResult.items) ||
      geometriesResult.items?.type !== 'object')
  ) {
    errors.push(`geometries binding must point to an array of objects`);
  }

  const fieldsToValidate: {
    binding: IDataModelReference | undefined;
    name: string;
    expectedType: string;
    defaultProperty?: string;
  }[] = [
    { binding: geometryLabel, name: 'geometryLabel', expectedType: 'string', defaultProperty: 'label' },
    { binding: geometryData, name: 'geometryData', expectedType: 'string', defaultProperty: 'data' },
  ];

  for (const { binding, name, expectedType, defaultProperty } of fieldsToValidate) {
    const fieldPath = binding ? binding.field.replace(`${geometries.field}.`, '') : defaultProperty;

    // Validate binding points to properties inside the geometries array
    if (binding && !binding.field.startsWith(`${geometries.field}.`)) {
      errors.push(
        `${name} must start with the geometries binding field (must point to a property inside the geometries array)`,
      );
      continue;
    }

    // Validate field type
    const fieldWithIndex = `${geometries.field}[0].${fieldPath}`;
    const [schema, err] =
      lookupBinding?.({
        field: fieldWithIndex,
        dataType: binding?.dataType ?? geometries.dataType,
      }) ?? [];

    if (err) {
      errors.push(lookupErrorAsText(err));
    } else if (schema?.type !== expectedType) {
      if (binding) {
        errors.push(`${name} field must be of type ${expectedType} (${binding.field} is of type ${schema?.type})`);
      } else {
        errors.push(
          `geometries array objects must have a '${defaultProperty}' property of type ${expectedType} (or specify a ${name} binding to override)`,
        );
      }
    }
  }

  return errors;
}
