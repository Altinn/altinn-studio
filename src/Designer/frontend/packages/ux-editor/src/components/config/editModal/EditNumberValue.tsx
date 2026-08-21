import type { IGenericEditComponent } from '../componentConfig';
import { FormField } from 'app-shared/components/FormField';
import type { PropertyDefinition } from '@app/layout-contract';
import { validateCatalogValue } from '../../../data/componentCatalog';
import { setComponentProperty } from '@altinn/ux-editor/utils/component';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';
import {
  useComponentPropertyLabel,
  useAppContext,
  useComponentPropertyHelpText,
} from '../../../hooks';
import { useTranslation } from 'react-i18next';
import { StudioDecimalInput, StudioSelect } from '@studio/components';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export interface EditNumberValueProps<T extends ComponentType> extends IGenericEditComponent<T> {
  propertyKey: string;
  enumValues?: number[];
  definition?: PropertyDefinition;
}

export const EditNumberValue = <T extends ComponentType>({
  component,
  handleComponentChange,
  propertyKey,
  enumValues,
  definition,
}: EditNumberValueProps<T>) => {
  const { t } = useTranslation();
  const componentPropertyLabel = useComponentPropertyLabel();
  const { updateLayoutsForPreview } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleValueChange = async (newValue: number) => {
    const nonNullValue = newValue ?? undefined;
    handleComponentChange(
      setComponentProperty(component, propertyKey as keyof FormItem<T>, nonNullValue),
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
      value={component[propertyKey as keyof FormItem<T>] as number | undefined}
      onChange={handleValueChange}
      customRequired={definition?.required}
      customValidationRules={(value) => validateCatalogValue(definition, value)}
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
              <StudioSelect.Option key={value} value={value}>
                {value}
              </StudioSelect.Option>
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
