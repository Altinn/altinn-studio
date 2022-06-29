/* eslint-disable react/prop-types */
import * as React from 'react';
import { Grid } from '@material-ui/core';
import type { ILabelSettings } from 'src/types';
import { HelpTextContainer } from './HelpTextContainer';
import type { ILanguage } from 'altinn-shared/types';
import { RequiredIndicator } from './RequiredIndicator';
import { OptionalIndicator } from './OptionalIndicator';

export interface IFormLabelProps {
  labelText: any;
  id: string;
  language: ILanguage;
  required: boolean;
  readOnly: boolean;
  labelSettings?: ILabelSettings;
  helpText: string;
}

export default function Label(props: IFormLabelProps) {
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
        >
          {props.labelText}
          <RequiredIndicator
            required={props.required}
            readOnly={props.readOnly}
            language={props.language}
          />
          <OptionalIndicator
            labelSettings={props.labelSettings}
            language={props.language}
            readOnly={props.readOnly}
            required={props.required}
          />
        </label>
      </Grid>
      {props.helpText && (
        <Grid item={true}>
          <HelpTextContainer
            language={props.language}
            helpText={props.helpText}
          />
        </Grid>
      )}
    </Grid>
  );
}
