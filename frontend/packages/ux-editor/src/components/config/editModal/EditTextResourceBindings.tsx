import React, { useMemo, useState } from 'react';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import classes from './EditTextResourceBindings.module.css';
import type { FormContainer } from '../../../types/FormContainer';
import type { FormComponent } from '../../../types/FormComponent';

export interface EditTextResourceBindingsProps {
  editFormId?: string;
  component: FormComponent | FormContainer;
  handleComponentChange: (component: FormComponent | FormContainer) => void;
  textResourceBindingKeys?: string[];
  layoutName?: string;
}

export const EditTextResourceBindings = ({
  component,
  handleComponentChange,
  textResourceBindingKeys,
}: EditTextResourceBindingsProps) => {
  const [keysSet, setKeysSet] = useState(
    Object.keys(textResourceBindingKeys || component.textResourceBindings || {}),
  );

  const keysToAdd = useMemo(
    () => textResourceBindingKeys.filter((key) => !keysSet.includes(key)),
    [keysSet, textResourceBindingKeys],
  );

  const handleRemoveKey = (key: string) => {
    setKeysSet((prevKeysSet) => prevKeysSet.filter((k) => k !== key));
  };

  return (
    <div className={classes.container}>
      {keysToAdd.map((key: string) => (
        <EditTextResourceBinding
          key={key}
          component={component}
          handleComponentChange={handleComponentChange}
          removeTextResourceBinding={() => handleRemoveKey(key)}
          textKey={key}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${key}` as any}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${key}_add` as any}
        />
      ))}
    </div>
  );
};
