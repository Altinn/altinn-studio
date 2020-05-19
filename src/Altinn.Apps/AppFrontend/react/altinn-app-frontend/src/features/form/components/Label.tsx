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
    <Grid
      item={true}
      id={`grid-id-${props.id}`}
      key={`grid-key-${props.id}`}
    >
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
        id={`label-${props.id}`}
        key={`label-key-${props.id}`}
      >
        {props.labelText}
        {(props.required || props.readOnly) ?
          null :
          <span className='label-optional'>
            ({getLanguageFromKey('general.optional', props.language)})
          </span>
        }
        {props.helpText &&
          <HelpTextContainer
            language={props.language}
            id={props.id}
            helpText={props.helpText}
          />
        }
      </label>
    </Grid>
  );
}
