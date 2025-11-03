import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { FormField } from '../../FormField';
import { setComponentProperty } from '@altinn/ux-editor/utils/component';
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
import { StudioDecimalInput, StudioSelect } from '@studio/components';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

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
  const { updateLayoutsForPreview } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleValueChange = async (newValue: number) => {
    const nonNullValue = newValue ?? undefined;
    handleComponentChange(
      setComponentProperty<T, number, K>(component, propertyKey, nonNullValue),
      {
        onSuccess: async () => {
          await updateLayoutsForPreview(layoutSet, true);
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
          <StudioSelect
            label={fieldProps.label}
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(Number(e.target.value))}
            id={`component-${String(propertyKey)}-select${component.id}`}
          >
            {enumValues.map((value: number) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </StudioSelect>
        ) : (
          <StudioDecimalInput
            label={fieldProps.label}
            onChangeNumber={fieldProps.onChange}
            value={fieldProps.value}
            validationErrorMessage={t('validation_errors.numbers_only')}
          />
        )
      }
    />
  );
};
