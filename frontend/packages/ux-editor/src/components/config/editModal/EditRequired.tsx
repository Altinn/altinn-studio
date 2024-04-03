import React from 'react';
import { Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import type { FormItem } from '../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';

export const EditRequired = <T extends ComponentType = ComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) => {
  const t = useText();

  const handleChange = (required: boolean) => {
    handleComponentChange({
      ...component,
      required,
    } as FormItem<T>);
  };

  return (
    <FormField
      id={component.id}
      value={(component as FormItem<T> & { required?: boolean }).required || false}
      onChange={handleChange}
      propertyPath='definitions/component/properties/required'
      renderField={({ fieldProps }) => (
        <Switch
          {...fieldProps}
          checked={fieldProps.value}
          onChange={(e) => handleChange(e.target.checked)}
          size='small'
        >
          {t('ux_editor.modal_configure_required')}
        </Switch>
      )}
    />
  );
};
