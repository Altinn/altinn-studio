import { StudioTextfield } from '../../../../StudioTextfield';
import { StudioTextarea } from '../../../../StudioTextarea';
import React from 'react';
import classes from './FieldsetContent.module.css';

export function FieldsetContent() {
  return (
    <div className={classes.fields}>
      <StudioTextfield label='Name' />
      <StudioTextarea label='Address' />
    </div>
  );
}
