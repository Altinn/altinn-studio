import React from 'react';

import { Grid } from '@material-ui/core';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ILabelSettings } from 'src/types';

export interface IFormLabelProps {
  labelText: React.ReactNode;
  id: string;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
  helpText: React.ReactNode;
}

export function Label(props: IFormLabelProps) {
  if (!props.labelText) {
    return null;
  }

  return (
    <Grid
      item={true}
      container={true}
      xs={12}
    >
      <Grid item={true}>
        <label
          className='a-form-label title-label'
          htmlFor={props.id}
          data-testid={`label-${props.id}`}
          id={`label-${props.id}`}
        >
          {props.labelText}
          <RequiredIndicator
            required={props.required}
            readOnly={props.readOnly}
          />
          <OptionalIndicator
            labelSettings={props.labelSettings}
            readOnly={props.readOnly}
            required={props.required}
          />
        </label>
      </Grid>
      {props.helpText && (
        <Grid item={true}>
          <HelpTextContainer
            helpText={props.helpText}
            title={getPlainTextFromNode(props.labelText)}
          />
        </Grid>
      )}
    </Grid>
  );
}
