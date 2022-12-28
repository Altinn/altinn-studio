import React from 'react';
import { Checkbox } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../componentConfig';

export const EditRequired = ({ component, handleComponentChange, language }: IGenericEditComponent) => {
  const [checked, setChecked] = React.useState(component.required);

  const handleChange = () => {
    setChecked(!checked);
    handleComponentChange({
      ...component,
      required: !component.required,
    });
  };

  return (
    <div>
      <Checkbox
        checked={checked}
        onChange={handleChange}
        checkboxId={`required-checkbox-${component.id}`}
        label={language['ux_editor.modal_configure_required']}
      />
    </div>
  );
};
