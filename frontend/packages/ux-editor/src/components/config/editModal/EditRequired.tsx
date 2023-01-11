import React, { useState } from 'react';
import { Checkbox } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';

export const EditRequired = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const [checked, setChecked] = useState(component.required);
  const t = useText();

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
        label={t('ux_editor.modal_configure_required')}
      />
    </div>
  );
};
