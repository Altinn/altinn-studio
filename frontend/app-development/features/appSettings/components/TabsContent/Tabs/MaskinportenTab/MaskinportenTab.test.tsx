import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { MaskinportenTab } from './MaskinportenTab';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

describe('MaskinportenTab', () => {
  it('should check and verify if the user is logged in', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: false }));

    renderMaskinportenTab({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
      },
    });
    await waitForLoggedInStatusCheckIsDone();
    await waitFor(() => expect(getIsLoggedInWithAnsattportenMock).toHaveBeenCalledTimes(1));
  });

  it('should display information about login and login button, if user is not logged in', async () => {
    renderMaskinportenTab();
    await waitForLoggedInStatusCheckIsDone();

    const title = screen.getByRole('heading', {
      level: 2,
      name: textMock('settings_modal.maskinporten_tab_title'),
    });
    expect(title).toBeInTheDocument();

    const description = screen.getByText(textMock('settings_modal.maskinporten_tab_description'));
    expect(description).toBeInTheDocument();

    const loginButton = screen.getByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });
    expect(loginButton).toBeInTheDocument();
  });

  it('should display content if logged in', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: true }));
    renderMaskinportenTab({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
      },
    });

    await waitForLoggedInStatusCheckIsDone();

    const loginButton = screen.queryByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });
    expect(loginButton).not.toBeInTheDocument();
  });

  it('should show an alert with text that no scopes are available for user', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: true }));

    const mockGetMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve([]));

    renderMaskinportenTab({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });

    await waitForLoggedInStatusCheckIsDone();

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_no_scopes_available_description')),
    ).toBeInTheDocument();
  });
});

type Props = {
  queries?: Partial<typeof queriesMock>;
};
const renderMaskinportenTab = ({ queries = queriesMock }: Props = {}) => {
  const queryClient = createQueryClientMock();
  renderWithProviders({ ...queriesMock, ...queries }, queryClient)(<MaskinportenTab />);
};

async function waitForLoggedInStatusCheckIsDone() {
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
}
