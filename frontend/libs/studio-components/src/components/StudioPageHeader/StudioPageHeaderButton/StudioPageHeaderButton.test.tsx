import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderButton, type StudioPageHeaderButtonProps } from './StudioPageHeaderButton';
import userEvent from '@testing-library/user-event';

describe('StudioPageHeaderButton', () => {
  it('should apply the correct class based on variant and color - regular dark', () => {
    renderStudioPageHeaderButton({ variant: 'regular', color: 'dark' });

    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toHaveClass('regularDark');
  });

  it('should apply the correct class based on variant and color - regular light', () => {
    renderStudioPageHeaderButton({ variant: 'regular', color: 'light' });

    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toHaveClass('regularLight');
  });

  it('should apply the correct class based on variant and color - preview dark', () => {
    renderStudioPageHeaderButton({ variant: 'preview', color: 'dark' });

    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toHaveClass('previewDark');
  });

  it('should apply the correct class based on variant and color - preview light', () => {
    renderStudioPageHeaderButton({ variant: 'preview', color: 'light' });

    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toHaveClass('previewLight');
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

const buttonText: string = 'Button';

const defaultProps: StudioPageHeaderButtonProps = {
  color: 'dark',
  variant: 'regular',
};

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
