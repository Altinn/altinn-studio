import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal, SettingsModalProps } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import { ApplicationMetadata, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { mockAppConfig } from './mocks/appConfigMock';
import { mockRepository1 } from './mocks/repositoryMock';
import { mockPolicy } from './mocks/policyMock';

const mockApp: string = 'app';
const mockOrg: string = 'org';
const mockCreatedBy: string = 'Mock Mockesen';

const mockPartyTypesAllowed: PartyTypesAllowed = {
  bankruptcyEstate: true,
  organisation: false,
  person: false,
  subUnit: false,
};

const mockAppMetadata: ApplicationMetadata = {
  id: 'mockId',
  org: mockOrg,
  partyTypesAllowed: mockPartyTypesAllowed,
};
jest.mock('../../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, unknown, AppConfig, unknown>);

describe('SettingsModal', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();

  const defaultProps: SettingsModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    policy: mockPolicy,
    org: mockOrg,
    app: mockApp,
    appConfig: mockAppConfig,
    repository: mockRepository1,
    createdBy: mockCreatedBy,
    appMetadata: mockAppMetadata,
  };

  it('closes the modal when the close button is clicked', async () => {
    render(<SettingsModal {...defaultProps} isOpen />);

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays left navigation bar on mount', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_about') })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_policy') })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_accessControl') })
    ).toBeInTheDocument();
  });

  it('displays the about tab, and not the other tabs, when modal opens first time', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "policy" when policy tab is clicked', async () => {
    renderWithQueryClient({}, createQueryClientMock(), defaultProps);

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const policyTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading'))
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "policy" to "about" when about tab is clicked', async () => {
    renderWithQueryClient({}, createQueryClientMock(), defaultProps);

    const policyTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    const aboutTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_about'),
    });
    await act(() => user.click(aboutTab));

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
  });

  it('changes the tab from "about" to "accessControl" when access control tab is clicked', async () => {
    renderWithQueryClient({}, createQueryClientMock(), defaultProps);

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const accessControlTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_accessControl'),
    });
    await act(() => user.click(accessControlTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading'))
    ).not.toBeInTheDocument();
  });
});

const renderWithQueryClient = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
  props: SettingsModalProps
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <SettingsModal {...props} />
    </ServicesContextProvider>
  );
};
