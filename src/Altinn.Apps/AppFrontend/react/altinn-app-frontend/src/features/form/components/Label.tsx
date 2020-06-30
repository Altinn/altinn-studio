/* eslint-disable react/prop-types */
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { HelpTextContainer } from './HelpTextContainer';

export interface IFormLabelProps {
  labelText: any;
  id: string;
  language: any;
  required: boolean;
  readOnly: boolean;
  helpText: string;
}

export default function Label(props: IFormLabelProps) {
  if (!props.labelText) {
    return null;
  }

  return (
    <Grid item={true} container={true} >
      <Grid item={true}>
        <label
          className='a-form-label title-label'
          htmlFor={props.id}
        >
          {props.labelText}
          {(props.required || props.readOnly) ?
            null :
            <span className='label-optional'>
              {` (${getLanguageFromKey('general.optional', props.language)})`}
            </span>
          }
        </label>
      </Grid>
      {props.helpText &&
        <Grid item={true} style={{ marginTop: '20px' }}>
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
