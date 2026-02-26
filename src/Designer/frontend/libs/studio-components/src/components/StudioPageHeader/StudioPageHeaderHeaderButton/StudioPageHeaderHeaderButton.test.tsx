import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioPageHeaderHeaderButton,
  type StudioPageHeaderHeaderButtonProps,
} from './StudioPageHeaderHeaderButton';
import userEvent from '@testing-library/user-event';

const buttonText: string = 'Button';
const defaultProps: StudioPageHeaderHeaderButtonProps = {
  variant: 'regular',
};

describe('StudioPageHeaderHeaderButton', () => {
  it('Renders the button with hardcoded styling', () => {
    renderStudioPageHeaderHeaderButton();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-color', 'neutral');
    expect(button).toHaveClass('ds-button');
    expect(button).toHaveClass('studioButton');
  });

  it('should forward ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderStudioPageHeaderHeaderButton({}, ref);

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
): ReturnType<typeof render> => {
  return render(
    <StudioPageHeaderHeaderButton ref={ref} {...defaultProps} {...props}>
      {buttonText}
    </StudioPageHeaderHeaderButton>,
  );
};
