import type { ReactElement } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { useComponentPropertyLabel } from '../../../hooks/useComponentPropertyLabel';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor-v4/hooks/useComponentPropertyEnumValue';
import {
  StudioSelect,
  StudioSuggestion,
  StudioTextfield,
  type StudioSuggestionItem,
} from '@studio/components';
import { useComponentPropertyHelpText } from '../../../hooks';

const NO_VALUE_SELECTED_IN_NATIVE_SELECT: string = 'NO_VALUE';

export interface EditStringValueProps extends IGenericEditComponent {
  propertyKey: string;
  enumValues?: string[];
  multiple?: boolean;
  className?: string;
}

export const EditStringValue = ({
  component,
  handleComponentChange,
  propertyKey,
  enumValues,
  multiple,
  className,
}: EditStringValueProps): ReactElement => {
  const { t } = useTranslation();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentEnumValue = useComponentPropertyEnumValue();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleValueChange = (newValue): void => {
    handleComponentChange({
      ...component,
      [propertyKey]: newValue,
    });
  };

  return (
    <FormField
      id={component.id}
      label={componentPropertyLabel(propertyKey)}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={`${component.propertyPath}/properties/${propertyKey}`}
      helpText={componentPropertyHelpText(propertyKey)}
      className={className}
      customValidationMessages={(errorCode: string) => {
        if (errorCode === 'pattern') {
          return t('validation_errors.pattern');
        }
      }}
      renderField={({ fieldProps }) =>
        enumValues ? (
          multiple ? (
            <StudioSuggestion
              multiple
              label={fieldProps.label}
              emptyText={t('general.no_options')}
              selected={toSuggestionItems(fieldProps.value, componentEnumValue)}
              onSelectedChange={(items: StudioSuggestionItem[]) =>
                fieldProps.onChange(items.map((item) => item.value))
              }
              id={`component-${propertyKey}-select${component.id}`}
            >
              {enumValues.map((value) => (
                <StudioSuggestion.Option
                  key={value}
                  value={value}
                  label={componentEnumValue(value)}
                >
                  {componentEnumValue(value)}
                </StudioSuggestion.Option>
              ))}
            </StudioSuggestion>
          ) : (
            <StudioSelect
              label={fieldProps.label}
              value={fieldProps?.value ?? NO_VALUE_SELECTED_IN_NATIVE_SELECT}
              onChange={(e) => {
                const newVal = e.target.value;
                fieldProps.onChange(
                  newVal === NO_VALUE_SELECTED_IN_NATIVE_SELECT ? undefined : newVal,
                );
              }}
              id={`component-${propertyKey}-select${component.id}`}
            >
              <NoValueSelectOption
                disabled={fieldProps?.value !== NO_VALUE_SELECTED_IN_NATIVE_SELECT}
              />
              <SelectOptions enumOptionsList={enumValues} componentEnumValue={componentEnumValue} />
            </StudioSelect>
          )
        ) : (
          <StudioTextfield
            {...fieldProps}
            id={`component-id-input${component.id}`}
            onChange={(e) => fieldProps.onChange(e.target.value, e)}
          />
        )
      }
    />
  );
};

const toSuggestionItems = (
  value: unknown,
  getLabel: (value: string) => string,
): StudioSuggestionItem[] =>
  Array.isArray(value) ? value.map((item) => ({ value: item, label: getLabel(item) })) : [];

type NoValueSelectOptionProps = {
  disabled: boolean;
};

const NoValueSelectOption = ({ disabled }: NoValueSelectOptionProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioSelect.Option value={NO_VALUE_SELECTED_IN_NATIVE_SELECT} disabled={disabled}>
      {t('ux_editor.edit_component.select_value')}
    </StudioSelect.Option>
  );
};

type SelectOptionsProps = {
  enumOptionsList: string[];
  componentEnumValue: (value: string) => string;
};
const SelectOptions = ({
  enumOptionsList,
  componentEnumValue,
}: SelectOptionsProps): ReactElement[] => {
  return enumOptionsList.map((value) => (
    <StudioSelect.Option key={value} value={value}>
      {componentEnumValue(value)}
    </StudioSelect.Option>
  ));
};
