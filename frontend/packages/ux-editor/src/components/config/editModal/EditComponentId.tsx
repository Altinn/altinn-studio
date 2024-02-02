import React from 'react';
import type { FormComponent } from '../../../types/FormComponent';
import { StudioTextField } from '@studio/components/src/components/StudioTextField/StudioTextField';

export interface IEditComponentId {
  handleComponentUpdate: (component: FormComponent) => void;
  component: FormComponent;
  helpText?: string;
}
export const EditComponentId = ({
  component,
  handleComponentUpdate,
  helpText,
}: IEditComponentId) => {
  const handleIdChange = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  // TODO
  // Missing:
  // - helpText
  // - Validation/Error handling
  // - onBlur improvement
  // - show key icon inside textfield
  // - Move "ID: " to text resource
  // - Add Test for all components

  return (
    <div>
      <StudioTextField
        viewProps={{
          children: `ID: ${component.id}`,
          variant: 'tertiary',
          fullWidth: true,
          style: { paddingLeft: 0, paddingRight: 0 },
        }}
        inputProps={{
          icon: undefined,
          value: component.id,
          onChange: (e) => handleIdChange(e.target.value),
          label: 'ID',
        }}
      />
    </div>
  );
};
