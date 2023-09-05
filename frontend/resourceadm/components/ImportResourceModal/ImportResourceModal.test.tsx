import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportResourceModal, ImportResourceModalProps } from './ImportResourceModal'; // Update the import path
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

describe('ImportResourceModal', () => {
  const mockOnClose = jest.fn();

  const defaultProps: ImportResourceModalProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  it('selects environment and service, then checks if import button exists', async () => {
    const user = userEvent.setup();

    render(<ImportResourceModal {...defaultProps} />);

    const importButtonText = textMock('resourceadm.dashboard_import_modal_import_button');
    const importButton = screen.queryByRole('button', { name: importButtonText });
    expect(importButton).not.toBeInTheDocument();

    const [, environmentSelect] = screen.getAllByLabelText(textMock('resourceadm.dashboard_import_modal_select_env'));
    await act(() => user.click(environmentSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'AT21' })))

    expect(environmentSelect).toHaveValue('AT21');
    expect(importButton).not.toBeInTheDocument();

    const [, serviceSelect] = screen.getAllByLabelText(textMock('resourceadm.dashboard_import_modal_select_service'));
    await act(() => user.click(serviceSelect));
    await act(() => user.click(screen.getByRole('option', { name: 'Service1' })))

    expect(serviceSelect).toHaveValue('Service1');
    expect(screen.getByRole('button', { name: importButtonText })).toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportResourceModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should be closed by default', () => {
    render(<ImportResourceModal isOpen={false} onClose={() => {}} />);
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });
});
