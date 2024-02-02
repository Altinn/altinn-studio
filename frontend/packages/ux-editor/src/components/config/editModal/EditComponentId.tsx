import React from 'react';
import type { FormComponent } from '../../../types/FormComponent';
import { StudioTextField } from '@studio/components/src/components/StudioTextField/StudioTextField';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import classes from './EditComponentId.module.css';

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
          prefix: <KeyVerticalIcon className={classes.prefixKeyIcon} />,
          icon: undefined,
          value: component.id,
          onChange: (e) => handleIdChange(e.target.value),
          label: 'ID',
          size: 'small',
        }}
      />
    </div>
  );
};
