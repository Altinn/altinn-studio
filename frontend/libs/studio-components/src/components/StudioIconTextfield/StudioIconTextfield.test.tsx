import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';
import { KeyVerticalIcon } from '@studio/icons';
import userEvent from '@testing-library/user-event';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioIconTextfield', () => {
  it('should render the textfield with label name', () => {
    renderStudioIconTextfield();
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('should render the textfield with value', () => {
    renderStudioIconTextfield();
    expect(screen.getByRole('textbox', { name: label })).toHaveValue(value);
  });

  it('should render label', () => {
    renderStudioIconTextfield();
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('should render textfield with label name when ID is set through props', () => {
    const id = 'id';
    renderStudioIconTextfield({ id });
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('should render the icon if provided', async () => {
    renderStudioIconTextfield({
      icon: <KeyVerticalIcon />,
    });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should render as readonly if readOnly prop is set', async () => {
    renderStudioIconTextfield({ readOnly: true });
    expect(screen.getByRole('textbox', { name: label })).toBeDisabled();
  });

  it('should render icon if readOnly prop is set', async () => {
    renderStudioIconTextfield({ readOnly: true });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('icon should have padLockIcon class if readOnly prop is set', async () => {
    renderStudioIconTextfield({ readOnly: true });
    expect(screen.getByRole('img')).toHaveClass('padLockIcon');
  });

  it('should render with two icons if custom icon is provided and readOnly prop is set', async () => {
    renderStudioIconTextfield({ icon: <KeyVerticalIcon />, readOnly: true });
    const icons = screen.getAllByRole('img');
    expect(icons).toHaveLength(2);
  });

  it('should execute onChange callback when input value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderStudioIconTextfield({ onChange });
    const textfield = screen.getByRole('textbox', { name: label });
    const newInput = 'newInput';
    await user.type(textfield, newInput);
    expect(onChange).toHaveBeenCalledTimes(newInput.length);
  });

  it('should forward the rest of the props to the input', () => {
    const getTextbox = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
    testCustomAttributes<HTMLInputElement>(renderStudioIconTextfield, getTextbox);
  });
});

const label = 'label';
const value = 'value';
const defaultProps: StudioIconTextfieldProps = {
  label,
  value,
};

const renderStudioIconTextfield = (props: Partial<StudioIconTextfieldProps> = {}): RenderResult => {
  return render(<StudioIconTextfield {...defaultProps} {...props} />);
};
