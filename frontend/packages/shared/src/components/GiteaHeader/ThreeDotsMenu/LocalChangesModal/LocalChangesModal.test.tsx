import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import type { LocalChangesModalProps } from './LocalChangesModal';
import { LocalChangesModal } from './LocalChangesModal';

describe('LocalChangesModal', () => {
  const user = userEvent.setup();

  it('calls onClose when the close button is clicked', async () => {
    render();

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('Does not display the modal when isOpen is false', () => {
    render({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Displays the modal when isOpen is true', () => {
    render({ isOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

const mockOnClose = jest.fn();
const mockApp: string = 'app';
const mockOrg: string = 'org';
const defaultProps: LocalChangesModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  org: mockOrg,
  app: mockApp,
};

const render = (
  props: Partial<LocalChangesModalProps> = defaultProps,
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <LocalChangesModal {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
