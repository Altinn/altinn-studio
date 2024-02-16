import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioToggableTextfield } from './StudioToggableTextfield';
import type { StudioToggableTextfieldProps } from './StudioToggableTextfield';

describe('StudioToggableTextfield', () => {
  it('Renders the view mode by default', () => {
    renderStudioTextField({});
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

const renderStudioTextField = (props: Partial<StudioToggableTextfieldProps>) => {
  const defaultProps: StudioToggableTextfieldProps = {
    inputProps: {
      value: 'value',
      onChange: jest.fn(),
      icon: <div />,
    },
    viewProps: {
      children: 'children',
      onClick: jest.fn(),
    },
    customValidation: jest.fn(),
    helpText: 'helpText',
  };
  return render(<StudioToggableTextfield {...defaultProps} {...props} />);
};
