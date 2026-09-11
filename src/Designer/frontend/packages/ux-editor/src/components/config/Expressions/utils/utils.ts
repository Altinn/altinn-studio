import type { FormItem } from '../../../../types/FormItem';
import type { BooleanExpression, Expression } from '@studio/components';
import type { FormItemProperty } from '../../../../types/FormItemProperty';
import { getBooleanExpressionProperties } from '../../../../data/componentCatalog';

export const expressionPropertiesOnFormItem = (componentType: string): FormItemProperty[] =>
  getBooleanExpressionProperties(componentType);

export const addExpressionToFormItem = <T extends FormItem>(
  formItem: T,
  property: FormItemProperty,
): T => {
  const defaultExpression: Expression = null;
  return setExpressionOnFormItem(formItem, property, defaultExpression);
};

export const setExpressionOnFormItem = <T extends FormItem>(
  formItem: T,
  property: FormItemProperty,
  expression: Expression,
): T => setValueAtPath(formItem, property.path, expression);

export const removeExpressionFromFormItem = <T extends FormItem>(
  formItem: T,
  property: FormItemProperty,
): T => setValueAtPath(formItem, property.path, undefined);

export const getDefinedExpressionProperties = (formItem: FormItem): FormItemProperty[] =>
  expressionPropertiesOnFormItem(formItem.type).filter(
    (property) => getPropertyValue(formItem, property) !== undefined,
  );

export const getUndefinedExpressionProperties = (formItem: FormItem): FormItemProperty[] =>
  expressionPropertiesOnFormItem(formItem.type).filter(
    (property) => getPropertyValue(formItem, property) === undefined,
  );

export const getPropertyValue = (
  formItem: FormItem,
  property: FormItemProperty,
): BooleanExpression | undefined => {
  let value: unknown = formItem;
  for (const segment of property.path) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value as BooleanExpression | undefined;
};

function setValueAtPath<T extends FormItem>(
  formItem: T,
  path: readonly string[],
  value: unknown,
): T {
  if (!path.length) return formItem;
  const [key, ...remainingPath] = path;
  if (!remainingPath.length) {
    const updatedFormItem = { ...formItem, [key]: value };
    if (value === undefined) delete updatedFormItem[key];
    return updatedFormItem;
  }

  const currentValue = formItem[key];
  const nestedValue =
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
      ? currentValue
      : {};
  return {
    ...formItem,
    [key]: setNestedValue(nestedValue as Record<string, unknown>, remainingPath, value),
  };
}

function setNestedValue(
  object: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): Record<string, unknown> {
  const [key, ...remainingPath] = path;
  const updatedObject = { ...object };
  if (!remainingPath.length) {
    if (value === undefined) delete updatedObject[key];
    else updatedObject[key] = value;
    return updatedObject;
  }

  const currentValue = object[key];
  const nestedValue =
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
      ? currentValue
      : {};
  updatedObject[key] = setNestedValue(nestedValue as Record<string, unknown>, remainingPath, value);
  return updatedObject;
}
