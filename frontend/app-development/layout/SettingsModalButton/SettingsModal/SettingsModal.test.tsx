import React from 'react';
import {
  render as rtlRender,
  screen,
  act,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SettingsModalProps } from './SettingsModal';
import { SettingsModal } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { MemoryRouter } from 'react-router-dom';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    app: mockApp,
    org: mockOrg,
  }),
}));

jest.mock('../../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, Error, AppConfig, unknown>);

describe('SettingsModal', () => {
  const user = userEvent.setup();
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockOnClose = jest.fn();

  const defaultProps: SettingsModalProps = {
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

  it('displays left navigation bar when promises resolves', async () => {
    await resolveAndWaitForSpinnerToDisappear();

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
      screen.getByRole('tab', { name: textMock('settings_modal.left_nav_tab_accessControl') }),
    ).toBeInTheDocument();
  });

  it('displays the about tab, and not the other tabs, when promises resolves first time', async () => {
    await resolveAndWaitForSpinnerToDisappear();

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
    await resolveAndWaitForSpinnerToDisappear();

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
    await resolveAndWaitForSpinnerToDisappear();

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

  it('changes the tab from "about" to "accessControl" when access control tab is clicked', async () => {
    await resolveAndWaitForSpinnerToDisappear();

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
    await resolveAndWaitForSpinnerToDisappear();

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

  /**
   * Resolves the mocks, renders the component and waits for the spinner
   * to be removed from the screen
   */
  const resolveAndWaitForSpinnerToDisappear = async () => {
    render(defaultProps);

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );
  };
});

const render = (
  props: SettingsModalProps,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queries} client={queryClient}>
        <SettingsModal {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
