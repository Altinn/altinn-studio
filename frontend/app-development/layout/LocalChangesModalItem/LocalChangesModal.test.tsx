import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { MemoryRouter } from 'react-router-dom';
import {
  LocalChangesModal,
  LocalChangesModalProps,
} from '../LocalChangesModalItem/LocalChangesModal';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    app: mockApp,
    org: mockOrg,
  }),
}));

const realConsole = console;

jest.mock('../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, Error, AppConfig, unknown>);

describe('LocalChangesModal', () => {
  const user = userEvent.setup();
  beforeEach(() => {
    global.console = {
      ...console,
      error: jest.fn(),
    };
  });
  afterEach(() => {
    global.console = realConsole;
    jest.clearAllMocks();
  });

  const mockOnClose = jest.fn();

  const defaultProps: LocalChangesModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    org: mockOrg,
    app: mockApp,
  };

  it('closes the modal when the close button is clicked', async () => {
    render(defaultProps);

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the modal based on isOpen prop', () => {
    render({ ...defaultProps, isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    render({ ...defaultProps, isOpen: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Should display the main heading of the modal when modal is open.', async () => {
    render({ ...defaultProps, isOpen: true });
    expect(
      screen.getByRole('heading', { name: textMock('dashboard.local_changes') }),
    ).toBeInTheDocument();
  });

  it("Should not display 'dashboard.local_changes' when modal is closed.", async () => {
    render({ ...defaultProps, isOpen: false });
    expect(
      screen.queryByRole('heading', { name: textMock('dashboard.local_changes') }),
    ).not.toBeInTheDocument();
  });

  it("Should display heading in 'LocalChangesTab' component when modal is open.", async () => {
    render({ ...defaultProps, isOpen: true });
    expect(
      screen.getByRole('heading', { name: textMock('settings_modal.local_changes_tab_heading') }),
    ).toBeInTheDocument;
  });
});

const render = (
  props: LocalChangesModalProps,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <LocalChangesModal {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
