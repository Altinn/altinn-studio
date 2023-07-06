import React from 'react';
import { Checkbox } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';

export const EditReadOnly = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      readOnly: !component.readOnly,
    });
  };

  return (
    <div>
      <Checkbox
        checked={component.readOnly}
        onChange={handleChange}
        checkboxId={`readonly-checkbox-${component.id}`}
        label={t('ux_editor.modal_configure_read_only')}
      />
    </div>
  );
};
