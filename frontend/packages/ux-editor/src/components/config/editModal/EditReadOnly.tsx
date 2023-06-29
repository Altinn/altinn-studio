import React from 'react';
import { Checkbox } from '@digdir/design-system-react';
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
      label={t('ux_editor.modal_configure_read_only')}
      value={component.readOnly}
      onChange={handleChange}
      propertyPath='definitions/component/properties/readOnly'
    >
      {({ value, onChange }) => <Checkbox
        checked={value}
        onChange={(e) => onChange(e.target.checked, e)}
      />}
    </FormField>
  );
};
