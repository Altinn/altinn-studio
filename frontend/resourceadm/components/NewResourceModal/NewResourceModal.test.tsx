import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewResourceModal, NewResourceModalProps } from './NewResourceModal';
import { act } from 'react-dom/test-utils'; // Import act if needed
import { textMock } from '../../../testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

describe('NewResourceModal', () => {
  const mockOnClose = jest.fn();

  const defaultProps: NewResourceModalProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  it('should be closed by default', () => {
    render({ isOpen: false, onClose: () => {} });
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('that create button should be disabled until the form is valid', () => {
    render(defaultProps);

    const createButton = screen.getByRole('button', { name: textMock('resourceadm.dashboard_create_modal_create_button') });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('that create button should be enabled when the form is valid', async () => {
    const user = userEvent.setup();
    render(defaultProps);

    const titleInput = screen.getByLabelText(textMock('resourceadm.dashboard_resource_name_and_id_resource_name'))
    await act(() => user.type(titleInput, 'test'))

    const createButton = screen.getByRole('button', { name: textMock('resourceadm.dashboard_create_modal_create_button') });
    expect(createButton).toHaveAttribute('aria-disabled', 'false');
  });
});

const render = (props: NewResourceModalProps) => {
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <NewResourceModal {...props} />
      </ServicesContextProvider>
    </MemoryRouter>
  )
}
