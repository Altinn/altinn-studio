import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';

describe('StudioIconTextfield', () => {
  it('render the component', () => {
    renderStudioIconTextfield({
      icon: <div />,
    });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
const renderStudioIconTextfield = (props: Partial<StudioIconTextfieldProps>) => {
  const defaultProps: StudioIconTextfieldProps = {
    icon: <div />,
  };
  return render(<StudioIconTextfield {...defaultProps} {...props} />);
};
