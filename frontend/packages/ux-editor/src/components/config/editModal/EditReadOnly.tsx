import React, { useState } from 'react';
import { Checkbox } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';

export const EditReadOnly = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const [checked, setChecked] = useState(component.readOnly);
  const t = useText();

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
        label={t('ux_editor.modal_configure_read_only')}
      />
    </div>
  );
};
