import React from 'react';
import { EditTextResourceBinding } from './EditTextResourceBinding/EditTextResourceBinding';
import type { FormContainer } from '../../../../types/FormContainer';
import type { FormComponent } from '../../../../types/FormComponent';
import { StudioProperty } from 'libs/studio-components/src';
import classes from './EditTextResourceBindings.module.css';

export interface EditTextResourceBindingBase {
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
  return (
    <StudioProperty.Group className={classes.texts}>
      {textResourceBindingKeys.map((key: string) => (
        <EditTextResourceBinding
          key={key}
          component={component}
          handleComponentChange={handleComponentChange}
          textKey={key}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${key}` as any}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${key}_add` as any}
        />
      ))}
    </StudioProperty.Group>
  );
};
