import React from 'react';
import { Checkbox } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../componentConfig';

export const EditReadOnly = ({ component, handleComponentChange, language }: IGenericEditComponent) => {
  const [checked, setChecked] = React.useState(component.readOnly);

  const handleChange = () => {
    setChecked(!checked);
    handleComponentChange({
      ...component,
      readOnly: !component.readOnly,
    });
  };

  return (
    <div>
      <Checkbox
        checked={checked}
        onChange={handleChange}
        checkboxId={`readonly-checkbox-${component.id}`}
        label={language['ux_editor.modal_configure_read_only']}
      />
    </div>
  );
};
