import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioProfileMenuButton,
  type StudioProfileMenuButtonProps,
} from './StudioProfileMenuButton';
import userEvent from '@testing-library/user-event';

const mockItemName: string = 'item';
const mockIsActive: boolean = false;
const mockOnClick = jest.fn();

describe('StudioProfileMenuButton', () => {
  it('should render the button with correct text', () => {
    renderStudioProfileMenuButton();

    const buttonElement = screen.getByRole('menuitem', { name: mockItemName });
    expect(buttonElement).toBeInTheDocument();
  });

  it('should call onClick function when the button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenuButton();

    const buttonElement = screen.getByRole('menuitem', { name: mockItemName });
    await user.click(buttonElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should apply the "selected" class when isActive is true', () => {
    renderStudioProfileMenuButton({ isActive: true });

    const buttonElement = screen.getByRole('listitem');
    expect(buttonElement).toHaveClass('selected');
  });

  it('should not have the "selected" class when isActive is false', () => {
    renderStudioProfileMenuButton();

    const buttonElement = screen.getByRole('listitem');
    expect(buttonElement).not.toHaveClass('selected');
  });
});

const defaultProps: StudioProfileMenuButtonProps = {
  itemName: mockItemName,
  isActive: mockIsActive,
  onClick: mockOnClick,
};

const renderStudioProfileMenuButton = (props: Partial<StudioProfileMenuButtonProps> = {}) => {
  return render(<StudioProfileMenuButton {...defaultProps} {...props} />);
};
