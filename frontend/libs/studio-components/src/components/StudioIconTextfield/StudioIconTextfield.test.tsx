import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';
import { KeyVerticalIcon } from '@studio/icons';
import userEvent from '@testing-library/user-event';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioIconTextfield', () => {
  afterEach(jest.clearAllMocks);

  it('should render label', () => {
    renderStudioIconTextfield();
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('should render value when provided', () => {
    const value = 'value';
    renderStudioIconTextfield({ value });
    expect(screen.getByRole('textbox', { name: label })).toHaveValue(value);
  });

  it('render icon when provided', () => {
    const icon = <KeyVerticalIcon />;
    renderStudioIconTextfield({ icon });
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('does not render the icon if not provided', () => {
    renderStudioIconTextfield();
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('should execute onChange callback when input value changes', async () => {
    const user = userEvent.setup();
    renderStudioIconTextfield();
    const input = screen.getByRole('textbox', { name: label });
    const inputValue = 'my id is 123';
    await user.type(input, inputValue);
    expect(onChange).toHaveBeenCalledTimes(inputValue.length);
  });

  it('should forward the rest of the props to the input', () => {
    const getTextbox = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
    testCustomAttributes<HTMLInputElement>(renderStudioIconTextfield, getTextbox);
  });
});

const label = 'label';
const onChange = jest.fn();
const defaultProps: StudioIconTextfieldProps = {
  label,
  onChange,
};

const renderStudioIconTextfield = (props: Partial<StudioIconTextfieldProps> = {}): RenderResult => {
  return render(<StudioIconTextfield {...defaultProps} {...props} />);
};
