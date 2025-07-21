import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { FormField } from '../../FormField';
import { setComponentProperty } from '@altinn/ux-editor/utils/component';
import { StudioDecimalInput, StudioNativeSelect } from '@studio/components-legacy';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';
import type { FilterKeysOfType } from 'app-shared/types/FilterKeysOfType';
import {
  useComponentPropertyLabel,
  useAppContext,
  useComponentPropertyHelpText,
} from '../../../hooks';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { useTranslation } from 'react-i18next';

type NumberKeys<ObjectType extends KeyValuePairs> = FilterKeysOfType<ObjectType, number>;

export interface EditNumberValueProps<T extends ComponentType, K extends NumberKeys<FormItem<T>>>
  extends IGenericEditComponent<T> {
  propertyKey: K;
  enumValues?: number[];
}

export const EditNumberValue = <T extends ComponentType, K extends NumberKeys<FormItem<T>>>({
  component,
  handleComponentChange,
  propertyKey,
  enumValues,
}: EditNumberValueProps<T, K>) => {
  const { t } = useTranslation();
  const componentPropertyLabel = useComponentPropertyLabel();
  const { selectedFormLayoutSetName, updateLayoutsForPreview } = useAppContext();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleValueChange = async (newValue: number) => {
    const nonNullValue = newValue ?? undefined;
    handleComponentChange(
      setComponentProperty<T, number, K>(component, propertyKey, nonNullValue),
      {
        onSuccess: async () => {
          await updateLayoutsForPreview(selectedFormLayoutSetName, true);
        },
      },
    );
  };

  return (
    <FormField
      id={component.id}
      label={componentPropertyLabel(String(propertyKey))}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={component.propertyPath}
      helpText={componentPropertyHelpText(String(propertyKey))}
      renderField={({ fieldProps }) =>
        enumValues ? (
          <StudioNativeSelect
            label={fieldProps.label}
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(Number(e.target.value))}
            id={`component-${String(propertyKey)}-select${component.id}`}
            size='sm'
          >
            {enumValues.map((value: number) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </StudioNativeSelect>
        ) : (
          <StudioDecimalInput
            {...fieldProps}
            onChange={fieldProps.onChange}
            validationErrorMessage={t('validation_errors.numbers_only')}
          />
        )
      }
    />
  );
};
