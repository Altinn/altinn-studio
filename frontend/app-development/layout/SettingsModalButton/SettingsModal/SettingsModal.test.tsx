import React, { createRef } from 'react';
import type { ByRoleOptions } from '@testing-library/react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { useAppConfigMutation } from '../../../hooks/mutations';
import { MemoryRouter } from 'react-router-dom';

import { SettingsModalContextProvider } from '../../../contexts/SettingsModalContext';
import { PreviewContextProvider } from '../../../contexts/PreviewContext';
import type { SettingsModalHandle } from '../../../types/SettingsModalHandle';

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
  afterEach(jest.clearAllMocks);

  it('closes the modal when the close button is clicked', async () => {
    await renderSettingsModal();

    const closeButton = screen.getByRole('button', {
      name: 'close modal', // Todo: Replace 'close modal' with textMock('settings_modal.close_button_label') when https://github.com/digdir/designsystemet/issues/2195 is fixed
    });
    await user.click(closeButton);
  });

  it('displays left navigation bar when promises resolve', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(getAboutTab()).toBeInTheDocument();
    expect(getSetupTab()).toBeInTheDocument();
    expect(getPolicyTab()).toBeInTheDocument();
    expect(getAccessTab()).toBeInTheDocument();
  });

  it('displays the about tab, and not the other tabs, when promises resolve first time', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(getAboutTab()).toBeInTheDocument();
    expect(querySetupHeading()).not.toBeInTheDocument();
    expect(queryPolicyHeading()).not.toBeInTheDocument();
    expect(queryAccessHeading()).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "policy" when policy tab is clicked', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(queryPolicyHeading()).not.toBeInTheDocument();
    await user.click(getPolicyTab());
    expect(getPolicyHeading()).toBeInTheDocument();
    expect(queryAboutHeading()).not.toBeInTheDocument();
  });

  it('changes the tab from "policy" to "about" when about tab is clicked', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    await user.click(getPolicyTab());
    await user.click(getAboutTab());
    expect(queryPolicyHeading()).not.toBeInTheDocument();
    expect(getAboutHeading()).toBeInTheDocument();
  });

  it('changes the tab from "about" to "accessControl" when access control tab is clicked', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(queryAccessHeading()).not.toBeInTheDocument();
    await user.click(getAccessTab());
    expect(getAccessHeading()).toBeInTheDocument();
    expect(queryAboutHeading()).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "setup" when setup control tab is clicked', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(querySetupHeading()).not.toBeInTheDocument();
    await user.click(getSetupTab());
    expect(getSetupHeading()).toBeInTheDocument();
    expect(queryAboutHeading()).not.toBeInTheDocument();
  });

  /**
   * Resolves the mocks, renders the component and waits for the spinner
   * to be removed from the screen
   */
  const resolveAndWaitForSpinnerToDisappear = async () => {
    await renderSettingsModal();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );
  };

  const getAboutTab = () => getTab(textMock('settings_modal.left_nav_tab_about'));
  const getSetupTab = () => getTab(textMock('settings_modal.left_nav_tab_setup'));
  const getPolicyTab = () => getTab(textMock('settings_modal.left_nav_tab_policy'));
  const getAccessTab = () => getTab(textMock('settings_modal.left_nav_tab_access_control'));
  const getTab = (name: string) => screen.getByRole('tab', { name });

  const getAboutHeading = () => getTabHeading(aboutHeading);
  const getSetupHeading = () => getTabHeading(setupHeading);
  const getPolicyHeading = () => getTabHeading(policyHeading);
  const getAccessHeading = () => getTabHeading(accessHeading);
  const getTabHeading = (name: string) => screen.getByRole('heading', tabPanelHeadingOptions(name));

  const queryAboutHeading = () => queryTabHeading(aboutHeading);
  const querySetupHeading = () => queryTabHeading(setupHeading);
  const queryPolicyHeading = () => queryTabHeading(policyHeading);
  const queryAccessHeading = () => queryTabHeading(accessHeading);
  const queryTabHeading = (name: string) =>
    screen.queryByRole('heading', tabPanelHeadingOptions(name));

  const tabPanelHeadingOptions = (name: string): ByRoleOptions => ({
    name,
    level: 2,
  });
  const aboutHeading = textMock('settings_modal.about_tab_heading');
  const setupHeading = textMock('settings_modal.setup_tab_heading');
  const policyHeading = textMock('settings_modal.policy_tab_heading');
  const accessHeading = textMock('settings_modal.access_control_tab_heading');
});

const renderSettingsModal = async (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const ref = createRef<SettingsModalHandle>();
  // eslint-disable-next-line testing-library/render-result-naming-convention
  const result = render(
    <MemoryRouter>
      <ServicesContextProvider {...queries} client={queryClient}>
        <SettingsModalContextProvider>
          <PreviewContextProvider>
            <SettingsModal ref={ref} />
          </PreviewContextProvider>
        </SettingsModalContextProvider>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
  ref.current?.openSettings();
  await screen.findByRole('dialog');
  return result;
};
