import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { FormComponent } from 'src/layout/LayoutComponent';

export function validateSimpleBindingWithOptionalGroup<T extends 'Checkboxes' | 'MultipleSelect'>(
  def: FormComponent<T>,
  ctx: LayoutValidationCtx<T>,
) {
  const errors: string[] = [];
  const allowedLeafTypes = ['string', 'boolean', 'number', 'integer'];
  const dataModelBindings = ctx.item.dataModelBindings ?? {};
  const groupBinding = dataModelBindings?.group;
  const simpleBinding = dataModelBindings?.simpleBinding;

  if (groupBinding) {
    const [groupErrors] = def.validateDataModelBindingsAny(ctx, 'group', ['array'], false);
    errors.push(...(groupErrors || []));

    if (!simpleBinding.field.startsWith(`${groupBinding.field}.`)) {
      errors.push(`simpleBinding must start with the group binding field (must point to a property inside the group)`);
    }
    const simpleBindingsWithoutGroup = simpleBinding.field.replace(`${groupBinding.field}.`, '');
    const fieldWithIndex = `${groupBinding.field}[0].${simpleBindingsWithoutGroup}`;
    const [schema, err] = ctx.lookupBinding({
      field: fieldWithIndex,
      dataType: simpleBinding.dataType,
    });

    if (err) {
      errors.push(lookupErrorAsText(err));
    } else if (typeof schema?.type !== 'string' || !allowedLeafTypes.includes(schema.type)) {
      errors.push(`Field ${simpleBinding} in group must be one of types ${allowedLeafTypes.join(', ')}`);
    }
  } else {
    const [newErrors] = def.validateDataModelBindingsSimple(ctx);
    errors.push(...(newErrors || []));
  }

  return errors;
}
