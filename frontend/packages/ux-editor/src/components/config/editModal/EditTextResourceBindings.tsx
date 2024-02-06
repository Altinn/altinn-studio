import React from 'react';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import classes from './EditTextResourceBindings.module.css';
import type { FormContainer } from '../../../types/FormContainer';
import type { FormComponent } from '../../../types/FormComponent';

export interface EditTextResourceBindingBase {
  editFormId?: string;
  component: FormComponent | FormContainer;
  handleComponentChange: (component: FormComponent | FormContainer) => void;
  layoutName?: string;
}

export interface EditTextResourceBindingsProps extends EditTextResourceBindingBase {
  textResourceBindingKeys: string[];
}

export const EditTextResourceBindings = ({
  component,
  handleComponentChange,
  textResourceBindingKeys,
}: EditTextResourceBindingsProps) => {
  const handleRemoveKey = (key: string) => {
    const updatedComponent = { ...component };
    delete updatedComponent.textResourceBindings[key];
    handleComponentChange(updatedComponent);
  };

  return (
    <div className={classes.container}>
      {textResourceBindingKeys.map((key: string) => (
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
