import React from 'react';
import { Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';

export const EditReadOnly = <T extends ComponentType = ComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) => {
  const t = useText();

  const handleChange = (readOnly: boolean) => {
    handleComponentChange({
      ...component,
      readOnly,
    } as FormItem<T>);
  };

  return (
    <FormField
      id={component.id}
      value={(component as FormItem<T> & { readOnly?: boolean }).readOnly || false}
      onChange={handleChange}
      propertyPath='definitions/component/properties/readOnly'
      renderField={({ fieldProps }) => (
        <Switch
          {...fieldProps}
          checked={fieldProps.value}
          onChange={(e) => handleChange(e.target.checked)}
          size='small'
        >
          {t('ux_editor.modal_configure_read_only')}
        </Switch>
      )}
    />
  );
};
