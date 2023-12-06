import React from 'react';
import { Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';

export const EditReadOnly = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      readOnly: !component.readOnly,
    });
  };

  return (
    <FormField
      id={component.id}
      value={component.readOnly || false}
      onChange={handleChange}
      propertyPath='definitions/component/properties/readOnly'
      renderField={({ fieldProps }) => (
        <Switch
          {...fieldProps}
          checked={fieldProps.value}
          onChange={(e) => fieldProps.onChange(e.target.checked, e)}
          size='small'
        >
          {t('ux_editor.modal_configure_read_only')}
        </Switch>
      )}
    />
  );
};
