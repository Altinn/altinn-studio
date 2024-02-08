import React from 'react';
import { StudioTextField, type StudioTextFieldProps } from '../StudioTextField';

export type StudioTextfieldSchemaProps = {
  schema: any;
} & StudioTextFieldProps;

export const StudioTextfieldSchema = ({
  schema,
  inputProps,
  viewProps,
  ...rest
}: StudioTextfieldSchemaProps) => {
  // ToDo
  // add  schema validation logic
  return <StudioTextField inputProps={inputProps} viewProps={viewProps} {...rest} />;
};
