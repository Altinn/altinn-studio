import React, { useRef } from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal, SettingsModalProps } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { MemoryRouter } from 'react-router-dom';

const mockButtonText: string = 'Mock Button';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    app: mockApp,
    org: mockOrg,
  }),
}));

// Mocking console.error due to Tanstack Query removing custom logger between V4 and v5 see issue: #11692
const realConsole = console;

jest.mock('../../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, Error, AppConfig, unknown>);

const mockOnClose = jest.fn();

const defaultProps: SettingsModalProps = {
  onClose: mockOnClose,
  org: mockOrg,
  app: mockApp,
};

describe('SettingsModal', () => {
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

  it('displays left navigation bar when promises resolves', async () => {
    await renderAndOpenModal();

    expect(
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_about') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_setup') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_policy') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_localChanges') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_accessControl') }),
    ).toBeInTheDocument();
  });

  it('displays the about tab, and not the other tabs, when promises resolves first time', async () => {
    await renderAndOpenModal();

    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "policy" when policy tab is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const policyTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "policy" to "about" when about tab is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const policyTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    const aboutTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_about'),
    });
    await act(() => user.click(aboutTab));

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
  });

  it('changes the tab from "about" to "localChanges" when local changes tab is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.local_changes_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const localChangesTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_localChanges'),
    });
    await act(() => user.click(localChangesTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.local_changes_tab_heading'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "accessControl" when access control tab is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const accessControlTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_accessControl'),
    });
    await act(() => user.click(accessControlTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "setup" when setup control tab is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.setup_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const setupTab = screen.getByRole('tab', {
      name: textMock('settings_modal.left_nav_tab_setup'),
    });
    await act(() => user.click(setupTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.setup_tab_heading'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });
});

const render = (
  props: Partial<SettingsModalProps> = {},
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
        <TestComponentWithButton {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (props: Partial<SettingsModalProps> = {}) => {
  const user = userEvent.setup();
  render(props);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<SettingsModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <SettingsModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};
