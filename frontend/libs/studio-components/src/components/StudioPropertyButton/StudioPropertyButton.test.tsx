import React, { RefObject } from 'react';
import { StudioPropertyButton, StudioPropertyButtonProps } from './StudioPropertyButton';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test data:
const property = 'Test property';
const defaultProps: StudioPropertyButtonProps = {
  property,
};

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

  it('Overrides the icon when a custom icon is given', () => {
    const iconTestId = 'custom-icon';
    const icon = <svg data-testid={iconTestId} />;
    renderButton({ icon });
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  it('Appends the given class name', () => {
    const className = 'test-class';
    renderButton({ className });
    expect(screen.getByRole('button', { name: property })).toHaveClass(className);
  });

  it('Forwards a ref to the button', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderButton({}, ref);
    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('Calls the onClick function when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderButton({ onClick });
    await act(() => user.click(screen.getByRole('button')));
    expect(onClick).toHaveBeenCalled();
  });
});

const renderButton = (
  props: Partial<StudioPropertyButtonProps> = {},
  ref?: RefObject<HTMLButtonElement>,
) => render(<StudioPropertyButton {...defaultProps} {...props} ref={ref} />);
