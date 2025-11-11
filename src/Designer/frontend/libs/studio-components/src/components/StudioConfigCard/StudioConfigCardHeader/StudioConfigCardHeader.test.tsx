import React from 'react';
import { render, type RenderResult, screen } from '@testing-library/react';
import { StudioConfigCardHeader, type StudioConfigCardHeaderProps } from './StudioConfigCardHeader';
import userEvent from '@testing-library/user-event';

describe('StudioConfigCardHeader', () => {
  it('should render the card label', () => {
    renderStudioConfigCardHeader();

    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteMock = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderStudioConfigCardHeader({ onDelete: onDeleteMock });

    const deleteButton = screen.getByRole('button', { name: 'Delete Card' });
    await user.click(deleteButton);
    expect(onDeleteMock).toHaveBeenCalled();
  });
});

const renderStudioConfigCardHeader = (
  props: Partial<StudioConfigCardHeaderProps> = {},
): RenderResult => {
  const defaultProps: StudioConfigCardHeaderProps = {
    cardLabel: 'Card Title',
    deleteAriaLabel: 'Delete Card',
    confirmDeleteMessage: 'Are you sure you want to delete this card?',
    onDelete: jest.fn(),
  };

  const mergedProps = { ...defaultProps, ...props };

  return render(<StudioConfigCardHeader {...mergedProps} />);
};
