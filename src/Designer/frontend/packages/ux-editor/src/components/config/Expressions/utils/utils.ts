import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../types/FormItem';
import type { BooleanExpression, Expression } from '@studio/components-legacy';
import { ObjectUtils } from '@studio/pure-functions';
import type { FormItemProperty } from '../../../../types/FormItemProperty';

export const expressionPropertiesOnFormItem = <T extends ComponentType>(
  componentType: T,
): FormItemProperty<T>[] => {
  // Todo: See if https://github.com/Altinn/altinn-studio/issues/12382 eliminates the need to cast the types in this function
  switch (componentType) {
    case ComponentType.Address:
    case ComponentType.Checkboxes:
    case ComponentType.Custom:
    case ComponentType.Datepicker:
    case ComponentType.Dropdown:
    case ComponentType.FileUpload:
    case ComponentType.FileUploadWithTag:
    case ComponentType.Input:
    case ComponentType.Likert:
    case ComponentType.List:
    case ComponentType.Map:
    case ComponentType.MultipleSelect:
    case ComponentType.RadioButtons:
    case ComponentType.TextArea:
      return [{ key: 'hidden' }, { key: 'required' }, { key: 'readOnly' }] as FormItemProperty<T>[];
    case ComponentType.RepeatingGroup:
      return [
        { key: 'hidden' },
        { key: 'edit', subKey: 'addButton' },
        { key: 'edit', subKey: 'editButton' },
        { key: 'edit', subKey: 'saveButton' },
        { key: 'edit', subKey: 'deleteButton' },
        { key: 'edit', subKey: 'alertOnDelete' },
        { key: 'edit', subKey: 'saveAndNextButton' },
      ] satisfies FormItemProperty<ComponentType.RepeatingGroup>[] as FormItemProperty<T>[];
    default:
      return [{ key: 'hidden' }];
  }
};

export const addExpressionToFormItem = <T extends ComponentType>(
  formItem: FormItem<T>,
  property: FormItemProperty<T>,
): FormItem<T> => {
  const defaultExpression: Expression = null;
  return setExpressionOnFormItem(formItem, property, defaultExpression);
};

export const setExpressionOnFormItem = <T extends ComponentType>(
  formItem: FormItem<T>,
  property: FormItemProperty<T>,
  expression: Expression,
): FormItem<T> => {
  const { key, subKey } = property;
  if (subKey) {
    return {
      ...formItem,
      [key]: {
        ...formItem[key],
        [subKey]: expression,
      },
    };
  }
  return {
    ...formItem,
    [key]: expression,
  };
};

export const removeExpressionFromFormItem = <T extends ComponentType>(
  formItem: FormItem<T>,
  property: FormItemProperty<T>,
): FormItem<T> => {
  const { key, subKey } = property;
  const newFormItem = ObjectUtils.deepCopy(formItem);
  if (subKey) {
    delete newFormItem[key][subKey];
  } else {
    delete newFormItem[key];
  }
  return newFormItem;
};

export const getDefinedExpressionProperties = <T extends ComponentType>(
  formItem: FormItem<T>,
): FormItemProperty<T>[] => {
  const expressionProperties = expressionPropertiesOnFormItem<T>(formItem.type as T); // Todo: Remove casting: https://github.com/Altinn/altinn-studio/issues/12382
  return expressionProperties.filter((property) => isPropertySet<T>(formItem, property));
};

export const getUndefinedExpressionProperties = <T extends ComponentType>(
  formItem: FormItem<T>,
): FormItemProperty<T>[] => {
  const expressionProperties = expressionPropertiesOnFormItem<T>(formItem.type as T); // Todo: Remove casting: https://github.com/Altinn/altinn-studio/issues/12382
  return expressionProperties.filter((property) => !isPropertySet<T>(formItem, property));
};

const isPropertySet = <T extends ComponentType>(
  formItem: FormItem<T>,
  property: FormItemProperty<T>,
): boolean => getPropertyValue(formItem, property) !== undefined;

export const getPropertyValue = <T extends ComponentType>(
  formItem: FormItem<T>,
  property: FormItemProperty<T>,
): Expression => {
  const { key, subKey } = property;
  if (subKey && formItem[key]) {
    return formItem[key][subKey] as BooleanExpression | undefined;
  }
  return formItem[key] as BooleanExpression | undefined;
  // Todo: Remove casting: https://github.com/Altinn/altinn-studio/issues/12382
};
