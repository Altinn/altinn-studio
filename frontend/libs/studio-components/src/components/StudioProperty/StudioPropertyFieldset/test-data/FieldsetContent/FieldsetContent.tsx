import { StudioTextfield } from '../../../../StudioTextfield';
import React from 'react';
import type { ReactElement } from 'react';
import classes from './FieldsetContent.module.css';

export function FieldsetContent(): ReactElement {
  return (
    <div className={classes.fields}>
      <StudioTextfield label='Name' />
      <StudioTextfield label='Address' />
    </div>
  );
}
