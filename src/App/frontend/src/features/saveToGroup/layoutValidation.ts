import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import {
  validateDataModelBindingsAny,
  validateDataModelBindingsSimple,
} from 'src/utils/layout/generator/validation/hooks';
import type { IDataModelBindings } from 'src/layout/layout';

export function useValidateSimpleBindingWithOptionalGroup<T extends 'Checkboxes' | 'MultipleSelect'>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
) {
  const errors: string[] = [];
  const allowedLeafTypes = ['string', 'boolean', 'number', 'integer'];
  const { group: groupBinding, simpleBinding, label: labelBinding, metadata: metadataBinding } = bindings ?? {};
  const lookupBinding = DataModels.useLookupBinding();
  const layoutLookups = useLayoutLookups();

  if (groupBinding) {
    const [groupErrors] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'group',
      ['array'],
      false,
    );
    errors.push(...(groupErrors || []));

    if (!simpleBinding.field.startsWith(`${groupBinding.field}.`)) {
      errors.push(`simpleBinding must start with the group binding field (must point to a property inside the group)`);
    }
    if (labelBinding && !labelBinding.field.startsWith(`${groupBinding.field}.`)) {
      errors.push(`label must start with the group binding field (must point to a property inside the group)`);
    }
    if (metadataBinding) {
      errors.push(`Metadata is not supported when using group`);
    }

    const simpleBindingsWithoutGroup = simpleBinding.field.replace(`${groupBinding.field}.`, '');
    const fieldWithIndex = `${groupBinding.field}[0].${simpleBindingsWithoutGroup}`;
    const [schema, err] =
      lookupBinding?.({
        field: fieldWithIndex,
        dataType: simpleBinding.dataType,
      }) ?? [];

    if (err) {
      errors.push(lookupErrorAsText(err));
    } else if (typeof schema?.type !== 'string' || !allowedLeafTypes.includes(schema.type)) {
      errors.push(`Field ${simpleBinding} in group must be one of types ${allowedLeafTypes.join(', ')}`);
    }
  } else {
    const newErrors = validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
    errors.push(...(newErrors || []));
  }

  return errors;
}
