import React from 'react';
import { Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';

export const EditRequired = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      required: !component.required,
    });
  };

  return (
    <FormField
      id={component.id}
      value={component.required || false}
      onChange={handleChange}
      propertyPath='definitions/component/properties/required'
      renderField={(props) => (
        <Switch
          checked={props.value}
          onChange={(e) => props.onChange(e.target.checked, e)}
          size='small'
        >
          {t('ux_editor.modal_configure_required')}
        </Switch>
      )}
    />
  );
};
