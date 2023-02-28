import React from 'react';

import { Grid } from '@material-ui/core';

import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { OptionalIndicator } from 'src/features/form/components/OptionalIndicator';
import { RequiredIndicator } from 'src/features/form/components/RequiredIndicator';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ILabelSettings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IFormLabelProps {
  labelText: React.ReactNode;
  id: string;
  language: ILanguage;
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
            title={getPlainTextFromNode(props.labelText)}
          />
        </Grid>
      )}
    </Grid>
  );
}
