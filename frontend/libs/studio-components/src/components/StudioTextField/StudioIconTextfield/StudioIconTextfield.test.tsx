import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';
import userEvent from '@testing-library/user-event';

describe('StudioIconTextfield', () => {});

const renderStudioIconTextfield = (props: Partial<StudioIconTextfieldProps>) => {
  const defaultProps: StudioIconTextfieldProps = {
    icon: <div />,
    prefix: null,
  };
  return render(<StudioIconTextfield {...defaultProps} {...props} />);
};
