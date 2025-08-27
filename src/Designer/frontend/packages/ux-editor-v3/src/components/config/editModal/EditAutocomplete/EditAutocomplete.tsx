import type { ChangeEvent, ReactElement } from 'react';
import React, { useCallback } from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import type { StudioNativeSelectProps } from 'libs/studio-components-legacy/src';
import { StudioNativeSelect } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { updateAutocomplete } from './updateAutocomplete';
import { autocompleteOptions } from './autocompleteOptions';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormComponent } from '../../../../types/FormComponent';

export type EditAutocompleteProps = IGenericEditComponent<FormComponent<ComponentTypeV3.Input>>;

export function EditAutocomplete({
  component,
  handleComponentChange,
}: EditAutocompleteProps): ReactElement {
  const { t } = useTranslation();

  const handleChange = useCallback(
    (value: string): void => {
      const updatedComponent = updateAutocomplete(component, value);
      handleComponentChange(updatedComponent);
    },
    [component, handleComponentChange],
  );

  return (
    <div>
      <FormField
        id={component.id}
        label={t('ux_editor.component_properties.autocomplete')}
        value={component.autocomplete}
        onChange={handleChange}
        propertyPath={`${component.propertyPath}/properties/autocomplete`}
        renderField={({ fieldProps }) => <AutocompleteField {...fieldProps} />}
      />
    </div>
  );
}

type AutocompleteFieldProps = {
  onChange: (value: string) => void;
} & Omit<StudioNativeSelectProps, 'onChange'>;

function AutocompleteField({ onChange, ...rest }: AutocompleteFieldProps): ReactElement {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <StudioNativeSelect onChange={handleChange} {...rest}>
      <EmptyOption />
      <AutocompleteOptions />
    </StudioNativeSelect>
  );
}

function EmptyOption(): ReactElement {
  const { t } = useTranslation();
  return <option value=''>{t('ux_editor.edit_component.no_value_selected_for_select')}</option>;
}

function AutocompleteOptions(): ReactElement {
  return (
    <>
      {autocompleteOptions.map((option: string) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </>
  );
}
