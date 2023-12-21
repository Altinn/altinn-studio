import React from 'react';

import { Grid } from '@material-ui/core';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import classes from 'src/components/form/Label.module.css';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useLanguage } from 'src/features/language/useLanguage';
import type { ILabelSettings } from 'src/layout/common.generated';

export interface IFormLabelProps {
  label: React.ReactNode;
  id: string;
  required?: boolean;
  readOnly?: boolean;
  labelSettings?: ILabelSettings;
  helpText?: React.ReactNode;
}

export function Label({ label, id, required, readOnly, labelSettings, helpText }: IFormLabelProps) {
  const { elementAsString } = useLanguage();
  const labelAsText = elementAsString(label);
  if (!label || !labelAsText) {
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
          className={classes.label}
          htmlFor={id}
          data-testid={`label-${id}`}
          id={`label-${id}`}
        >
          {label}
          <RequiredIndicator
            required={required}
            readOnly={readOnly}
          />
          <OptionalIndicator
            labelSettings={labelSettings}
            readOnly={readOnly}
            required={required}
          />
        </label>
      </Grid>
      {helpText && (
        <Grid item={true}>
          <HelpTextContainer
            helpText={helpText}
            title={labelAsText}
          />
        </Grid>
      )}
    </Grid>
  );
}
