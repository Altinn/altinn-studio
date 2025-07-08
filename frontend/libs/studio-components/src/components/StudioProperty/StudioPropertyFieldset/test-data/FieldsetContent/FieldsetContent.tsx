import { StudioTextfield } from '../../../../StudioTextfield';
import React from 'react';
import classes from './FieldsetContent.module.css';

export function FieldsetContent() {
  return (
    <div className={classes.fields}>
      <StudioTextfield label='Name' />
      <StudioTextfield label='Address' />
    </div>
  );
}
