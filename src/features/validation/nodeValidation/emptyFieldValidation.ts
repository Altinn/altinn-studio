import {
  type ComponentValidation,
  FrontendValidationSource,
  type ValidationDataSources,
  ValidationMask,
} from 'src/features/validation';
import { getFieldNameKey } from 'src/utils/formComponentUtils';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes, CompWithBinding } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Default implementation of runEmptyFieldValidation
 * Checks all of the component's dataModelBindings and returns one error for each one missing data
 */
export function runEmptyFieldValidationAllBindings<Type extends CompTypes>(
  node: LayoutNode<Type>,
  { formDataSelector, invalidDataSelector, nodeDataSelector }: ValidationDataSources,
): ComponentValidation[] {
  const required = nodeDataSelector(
    (picker) => {
      const item = picker(node.id, node.type)?.item;
      return item && 'required' in item ? item.required : false;
    },
    [node],
  );
  const dataModelBindings = nodeDataSelector((picker) => picker(node.id, node.type)?.layout.dataModelBindings, [node]);
  if (!required || !dataModelBindings) {
    return [];
  }

  const validations: ComponentValidation[] = [];

  for (const [bindingKey, reference] of Object.entries(dataModelBindings as Record<string, IDataModelReference>)) {
    const data = formDataSelector(reference) ?? invalidDataSelector(reference);
    const asString =
      typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';
    const trb = nodeDataSelector((picker) => picker(node.id, node.type)?.item?.textResourceBindings, [node]);

    if (asString.length === 0) {
      const key =
        trb && 'requiredValidation' in trb && trb.requiredValidation
          ? trb.requiredValidation
          : 'form_filler.error_required';
      const fieldReference = { key: getFieldNameKey(trb, bindingKey), makeLowerCase: true };

      validations.push({
        source: FrontendValidationSource.EmptyField,
        bindingKey,
        message: { key, params: [fieldReference] },
        severity: 'error',
        category: ValidationMask.Required,
      });
    }
  }
  return validations;
}

/**
 * Special implementation of runEmptyFieldValidation
 * Only checks simpleBinding, this is useful for components that may save additional data which is not directly controlled by the user,
 * like options-based components that can store the label and metadata about the options along side the actual value
 */
export function runEmptyFieldValidationOnlySimpleBinding<Type extends CompWithBinding<'simpleBinding'>>(
  node: LayoutNode<Type>,
  { formDataSelector, invalidDataSelector, nodeDataSelector }: ValidationDataSources,
): ComponentValidation[] {
  const required = nodeDataSelector(
    (picker) => {
      const item = picker(node.id, node.type)?.item;
      return item && 'required' in item ? item.required : false;
    },
    [node],
  );
  const reference = nodeDataSelector(
    (picker) => picker(node.id, node.type)?.layout.dataModelBindings.simpleBinding,
    [node],
  );
  if (!required || !reference) {
    return [];
  }

  const validations: ComponentValidation[] = [];

  const data = formDataSelector(reference) ?? invalidDataSelector(reference);
  const asString =
    typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';
  const trb = nodeDataSelector((picker) => picker(node.id, node.type)?.item?.textResourceBindings, [node]);

  if (asString.length === 0) {
    const key =
      trb && 'requiredValidation' in trb && trb.requiredValidation
        ? trb.requiredValidation
        : 'form_filler.error_required';
    const fieldReference = { key: getFieldNameKey(trb, 'simpleBinding'), makeLowerCase: true };

    validations.push({
      source: FrontendValidationSource.EmptyField,
      bindingKey: 'simpleBinding',
      message: { key, params: [fieldReference] },
      severity: 'error',
      category: ValidationMask.Required,
    });
  }
  return validations;
}
