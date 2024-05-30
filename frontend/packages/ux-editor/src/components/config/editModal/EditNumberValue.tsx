import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { FormField } from '../../FormField';
import { setComponentProperty } from '../../../utils/component';
import { StudioDecimalInput } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';
import type { FilterKeysOfType } from 'app-shared/types/FilterKeysOfType';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../hooks';

type NumberKeys<ObjectType extends KeyValuePairs> = FilterKeysOfType<ObjectType, number>;

export interface EditNumberValueProps<T extends ComponentType, K extends NumberKeys<FormItem<T>>>
  extends IGenericEditComponent<T> {
  propertyKey: K;
  helpText?: string;
}

export const EditNumberValue = <T extends ComponentType, K extends NumberKeys<FormItem<T>>>({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
}: EditNumberValueProps<T, K>) => {
  const { t } = useTranslation();
  const componentPropertyLabel = useComponentPropertyLabel();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const handleValueChange = async (newValue: number) => {
    await handleComponentChange(
      setComponentProperty<T, number, K>(component, propertyKey, newValue),
      {
        onSuccess: async () => {
          await refetchLayouts(selectedFormLayoutSetName, true);
        },
      },
    );
  };

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={component.propertyPath}
      helpText={helpText}
      renderField={({ fieldProps }) => (
        <StudioDecimalInput
          {...fieldProps}
          onChange={fieldProps.onChange}
          description={componentPropertyLabel(propertyKey as string)}
          validationErrorMessage={t('validation_errors.numbers_only')}
        />
      )}
    />
  );
};
