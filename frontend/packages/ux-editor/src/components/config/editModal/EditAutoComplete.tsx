import React, { type ChangeEvent } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { NativeSelect } from '@digdir/design-system-react';
import { HTMLAutoCompleteValue } from 'app-shared/types/HTMLAutoCompleteValue';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';

const htmlAutoCompleteValues: HTMLAutoCompleteValue[] = Object.values(HTMLAutoCompleteValue);
const isHTMLAutoCompleteValue = (value: string): value is HTMLAutoCompleteValue =>
  htmlAutoCompleteValues.includes(value as HTMLAutoCompleteValue);
const options: (HTMLAutoCompleteValue | '')[] = ['', ...htmlAutoCompleteValues];

export const EditAutoComplete = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Input | ComponentType.TextArea>) => {
  const { t } = useTranslation();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.target;
    const newValue = isHTMLAutoCompleteValue(value) ? value : undefined;
    const updatedComponent: FormItem<ComponentType.Input | ComponentType.TextArea> = {
      ...component,
      autocomplete: newValue,
    };
    handleComponentChange(updatedComponent);
  };

  return (
    <NativeSelect
      label={t('ux_editor.component_properties.autocomplete')}
      onChange={handleChange}
      defaultValue={component.autocomplete}
      size='small'
    >
      {options.map((value: HTMLAutoCompleteValue) => (
        <option key={value} value={value}>
          {value || t('ux_editor.component_properties.autocomplete_default')}
        </option>
      ))}
    </NativeSelect>
  );
};
