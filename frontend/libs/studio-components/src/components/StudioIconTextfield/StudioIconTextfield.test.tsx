import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';
import { KeyVerticalIcon } from '@studio/icons';
import userEvent from '@testing-library/user-event';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioIconTextfield', () => {
  it('render the icon', async () => {
    renderStudioIconTextfield({
      icon: <KeyVerticalIcon title='my key icon title' />,
    });
    expect(screen.getByTitle('my key icon title')).toBeInTheDocument();
  });

  it('should render label', () => {
    renderStudioIconTextfield({
      icon: <div />,
      label: 'id',
    });
    expect(screen.getByLabelText('id')).toBeInTheDocument();
  });

  it('should execute onChange callback when input value changes', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();

    renderStudioIconTextfield({
      icon: <div />,
      label: 'Your ID',
      onChange: onChangeMock,
    });

    const input = screen.getByLabelText('Your ID');

    const inputValue = 'my id is 123';
    await user.type(input, inputValue);
    expect(onChangeMock).toHaveBeenCalledTimes(inputValue.length);
  });

  it('should forward the rest of the props to the input', () => {
    const getTextbox = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
    testCustomAttributes<HTMLInputElement>(renderStudioIconTextfield, getTextbox);
  });
});
const renderStudioIconTextfield = (props: StudioIconTextfieldProps) => {
  return render(<StudioIconTextfield {...props} />);
};
