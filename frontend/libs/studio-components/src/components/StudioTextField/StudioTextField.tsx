import React, { useState } from 'react';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import {
  StudioIconTextfield,
  type StudioIconTextfieldProps,
} from './StudioIconTextfield/StudioIconTextfield';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView/StudioTextfieldToggleView';

export type StudioTextFieldProps = {
  viewProps: StudioTextfieldToggleViewProps;
  inputProps: StudioIconTextfieldProps;
};
export const StudioTextField = ({ inputProps, viewProps }: StudioTextFieldProps) => {
  const [isViewMode, setIsViewMode] = useState(true);

  const toggleViewMode = () => {
    setIsViewMode((prevMode) => !prevMode);
  };

  if (isViewMode) return <StudioTextfieldToggleView onClick={toggleViewMode} {...viewProps} />;
  return <StudioIconTextfield onBlur={toggleViewMode} {...inputProps} />;
};
