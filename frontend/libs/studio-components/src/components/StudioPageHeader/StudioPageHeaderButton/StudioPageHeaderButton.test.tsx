import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderButton, type StudioPageHeaderButtonProps } from './StudioPageHeaderButton';
import userEvent from '@testing-library/user-event';

const buttonText: string = 'Button';
const defaultProps: StudioPageHeaderButtonProps = {
  color: 'dark',
  variant: 'regular',
};

describe('StudioPageHeaderButton', () => {
  it('Passes the colour and variant classes to the button', () => {
    renderStudioPageHeaderButton();
    const button = screen.getByRole('button');
    expect(button).toHaveClass(defaultProps.color);
    expect(button).toHaveClass(defaultProps.variant);
  });

  it('should forward ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderStudioPageHeaderButton({ color: 'dark' }, ref);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should call the onClick function when the button is clicked', async () => {
    const user = userEvent.setup();

    const mockOnClick = jest.fn();
    renderStudioPageHeaderButton({ onClick: mockOnClick });

    const button = screen.getByRole('button', { name: buttonText });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

const renderStudioPageHeaderButton = (
  props: Partial<StudioPageHeaderButtonProps> = {},
  ref?: React.Ref<HTMLButtonElement>,
) => {
  return render(
    <StudioPageHeaderButton ref={ref} {...defaultProps} {...props}>
      {buttonText}
    </StudioPageHeaderButton>,
  );
};
