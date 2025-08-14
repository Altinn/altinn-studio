import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import {
  StudioPageHeaderHeaderButton,
  type StudioPageHeaderHeaderButtonProps,
} from './StudioPageHeaderHeaderButton';
import userEvent from '@testing-library/user-event';

const buttonText: string = 'Button';
const defaultProps: StudioPageHeaderHeaderButtonProps = {
  color: 'dark',
  variant: 'regular',
};

describe('StudioPageHeaderHeaderButton', () => {
  it('Passes the colour and variant classes to the button', () => {
    renderStudioPageHeaderHeaderButton();
    const button = screen.getByRole('button');
    expect(button).toHaveClass(defaultProps.color);
    expect(button).toHaveClass(defaultProps.variant);
  });

  it('should forward ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderStudioPageHeaderHeaderButton({ color: 'dark' }, ref);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should call the onClick function when the button is clicked', async () => {
    const user = userEvent.setup();

    const mockOnClick = jest.fn();
    renderStudioPageHeaderHeaderButton({ onClick: mockOnClick });

    const button = screen.getByRole('button', { name: buttonText });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

const renderStudioPageHeaderHeaderButton = (
  props: Partial<StudioPageHeaderHeaderButtonProps> = {},
  ref?: React.Ref<HTMLButtonElement>,
): RenderResult => {
  return render(
    <StudioPageHeaderHeaderButton ref={ref} {...defaultProps} {...props}>
      {buttonText}
    </StudioPageHeaderHeaderButton>,
  );
};
