/* eslint-disable react/prop-types */
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { HelpTextContainer } from './HelpTextContainer';
import { ILanguage } from 'altinn-shared/types';

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
        >
          {props.labelText}
          {(props.labelSettings?.optionalIndicator === false || props.required || props.readOnly) ?
            null :
            <span className='label-optional'>
              {` (${getLanguageFromKey('general.optional', props.language)})`}
            </span>
          }
        </label>
      </Grid>
      {props.helpText &&
        <Grid item={true}>
          <HelpTextContainer
            language={props.language}
            id={props.id}
            helpText={props.helpText}
          />
        </Grid>
      }
    </Grid>
  );
}
