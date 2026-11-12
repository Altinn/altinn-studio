import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { validateOptionsDataModelBindings } from 'src/features/options/validation';
import {
  indexDataModelReferenceForValidation,
  validateDataModelBindingsAny,
  validateDataModelBindingsSimple,
} from 'src/utils/layout/validation/utils';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export function validateSimpleBindingWithOptionalGroup<T extends 'Checkboxes' | 'MultipleSelect'>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
) {
  const errors: string[] = [];
  const allowedLeafTypes = ['string', 'boolean', 'number', 'integer'];
  const { group: groupBinding, simpleBinding, label: labelBinding, metadata: metadataBinding } = bindings ?? {};

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
    } else if (labelBinding && labelBinding.dataType !== groupBinding.dataType) {
      errors.push('label must use the group binding data type');
    } else if (labelBinding) {
      errors.push(
        ...validateOptionsDataModelBindings(
          baseComponentId,
          {
            ...bindings,
            label: {
              ...labelBinding,
              field: `${groupBinding.field}[0].${labelBinding.field.slice(groupBinding.field.length + 1)}`,
            },
            metadata: undefined,
          },
          lookupBinding,
          layoutLookups,
          'single',
        ),
      );
    }
    if (metadataBinding) {
      errors.push(`Metadata is not supported when using group`);
    }

    const simpleBindingsWithoutGroup = simpleBinding.field.replace(`${groupBinding.field}.`, '');
    const fieldWithIndex = `${groupBinding.field}[0].${simpleBindingsWithoutGroup}`;
    const [schema, err] =
      lookupBinding?.(
        indexDataModelReferenceForValidation(
          baseComponentId,
          {
            field: fieldWithIndex,
            dataType: simpleBinding.dataType,
          },
          layoutLookups,
        ),
      ) ?? [];

    if (err) {
      errors.push(lookupErrorAsText(err));
    } else if (typeof schema?.type !== 'string' || !allowedLeafTypes.includes(schema.type)) {
      errors.push(`Field ${simpleBinding} in group must be one of types ${allowedLeafTypes.join(', ')}`);
    }
  } else {
    const newErrors = validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
    errors.push(...(newErrors || []));
    errors.push(...validateOptionsDataModelBindings(baseComponentId, bindings, lookupBinding, layoutLookups, 'multi'));
  }

  return errors;
}
