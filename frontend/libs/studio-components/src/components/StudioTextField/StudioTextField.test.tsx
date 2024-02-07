import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioTextField } from './StudioTextField';
import type { StudioTextFieldProps } from './StudioTextField';
import userEvent from '@testing-library/user-event';

describe('StudioTextField', () => {});

const renderStudioTextField = (props: Partial<StudioTextFieldProps>) => {
  const defaultProps: StudioTextFieldProps = {
    inputProps: {
      label: 'label',
      icon: <div />,
      prefix: <div />,
    },
    viewProps: {
      children: <div />,
      onClick: () => {},
    },
  };
  return render(<StudioTextField {...defaultProps} {...props} />);
};
