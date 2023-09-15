import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal, SettingsModalProps } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { Policy } from '@altinn/policy-editor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClient } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockPolicy: Policy = {
  rules: [{ ruleId: '1', description: '', subject: [], actions: [], resources: [[]] }],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '3',
};

describe('SettingsModal', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();

  const defaultProps: SettingsModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    policy: mockPolicy,
    org: mockOrg,
    app: mockApp,
  };

  it('closes the modal when the close button is clicked', async () => {
    const user = userEvent.setup();
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
  });

  it('displays the about tab, and not the other tabs, when modal opens first time', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('about')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
  });

  it('changes the tab displayed when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient({}, createQueryClientMock(), defaultProps);

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('about')).toBeInTheDocument();

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
    expect(screen.queryByText('about')).not.toBeInTheDocument();
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
