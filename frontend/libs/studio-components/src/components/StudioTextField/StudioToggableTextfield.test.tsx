import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioToggableTextfield } from './StudioToggableTextfield';
import type { StudioToggableTextfieldProps } from './StudioToggableTextfield';
import userEvent from '@testing-library/user-event';

// ---

describe('StudioToggableTextfield', () => {
  it('Renders the view mode by default', () => {
    renderStudioTextField({});
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('Calls the handleOnChange when onChange is called', async () => {
    const user = userEvent;

    const onChange = jest.fn();
    await act(() => user.click(screen.getByRole('button')));
    renderStudioTextField({
      inputProps: {
        onChange,
        icon: <div />,
        hidden: true,
      },
    });

    const input = screen.getByRole('textbox');

    await user.type(input, 'new value');

    expect(onChange).toHaveBeenCalled();
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
    },
  };
  return render(<StudioToggableTextfield {...defaultProps} {...props} />);
};
