import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView';
import userEvent from '@testing-library/user-event';

describe('StudioTextfieldToggleView', () => {});

const renderStudioTextfieldToggleView = (props: Partial<StudioTextfieldToggleViewProps>) => {
  const defaultProps: StudioTextfieldToggleViewProps = {
    onClick: () => {},
  };
  return render(<StudioTextfieldToggleView {...defaultProps} {...props} />);
};
