import type { ForwardedRef } from 'react';
import React from 'react';
import type { StudioPropertyButtonProps } from './StudioPropertyButton';
import { StudioPropertyButton } from './StudioPropertyButton';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testRootClassNameAppending } from '../../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';

// Test data:
const property = 'Test property';
const defaultProps: StudioPropertyButtonProps = {
  property,
};

// Mocks:
jest.mock('./StudioPropertyButton.module.css', () => ({
  compact: 'compact',
}));

describe('StudioPropertyButton', () => {
  it('Renders a button with the property name', () => {
    renderButton();
    expect(screen.getByRole('button', { name: property })).toHaveTextContent(property);
  });

  it('Renders both the property and the value when a value is given', () => {
    const value = 'Test value';
    renderButton({ value });
    expect(screen.getByRole('button', { name: property })).toHaveTextContent(property);
    expect(screen.getByRole('button', { name: property })).toHaveTextContent(value);
  });

  it('Renders both the property and the value when a value is 0', () => {
    const value = 0;
    renderButton({ value });
    const button = screen.getByRole('button', { name: property });
    expect(button).toHaveTextContent(property);
    expect(button).toHaveTextContent(value.toString());
  });

  it('Overrides the icon when a custom icon is given', () => {
    const iconTestId = 'custom-icon';
    const icon = <svg data-testid={iconTestId} />;
    renderButton({ icon });
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  it('Appends the given class name', () => {
    testRootClassNameAppending((className) => renderButton({ className }));
  });

  it('Forwards a ref to the button', () => {
    testRefForwarding<HTMLButtonElement>((ref) => renderButton({}, ref), getButton);
  });

  it('Calls the onClick function when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderButton({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('Renders a compact button when the compact prop is true', () => {
    renderButton({ compact: true });
    expect(getButton()).toHaveClass('compact');
  });

  it('Calls the onClick function with a click event when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderButton({ onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }));
  });

  it('Does not call the onClick function when the button is read-only', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderButton({ readOnly: true, onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

const renderButton = (
  props: Partial<StudioPropertyButtonProps> = {},
  ref?: ForwardedRef<HTMLButtonElement>,
) => render(<StudioPropertyButton {...defaultProps} {...props} ref={ref} />);

const getButton = (): HTMLButtonElement => screen.getByRole('button');
