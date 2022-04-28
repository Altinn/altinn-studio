/* eslint-disable react/prop-types */
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { ILabelSettings } from 'src/types';
import { HelpTextContainer } from './HelpTextContainer';
import { ILanguage } from 'altinn-shared/types';
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

  const shouldShowRequiredMarking = props.required && !props.readOnly;
  const shouldShowOptionalMarking = props.labelSettings?.optionalIndicator && !props.required && !props.readOnly;

  return (
    <Grid item={true} container={true} xs={12}>
      <Grid item={true}>
        <label
          className='a-form-label title-label'
          htmlFor={props.id}
          data-testid={`label-${props.id}`}
        >
          {props.labelText}
          {shouldShowRequiredMarking &&
            <RequiredIndicator />
          }
          {shouldShowOptionalMarking &&
            <OptionalIndicator />
          }
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
