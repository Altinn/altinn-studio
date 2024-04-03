import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NavigationModalProps } from './NavigationModal';
import { NavigationModal } from './NavigationModal';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

describe('NavigationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnNavigate = jest.fn();

  const defaultProps: NavigationModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    onNavigate: mockOnNavigate,
    title: textMock('resourceadm.resource_navigation_modal_title_policy'),
  };

  it('should be closed by default', () => {
    render(
      <NavigationModal isOpen={false} onClose={() => {}} onNavigate={mockOnNavigate} title='tit' />,
    );
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<NavigationModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_stay'),
    });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onNavigate function when navigate button is clicked', async () => {
    const user = userEvent.setup();
    render(<NavigationModal {...defaultProps} />);

    const navigateButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_move_on'),
    });
    await act(() => user.click(navigateButton));

    expect(mockOnNavigate).toHaveBeenCalled();
  });
});
