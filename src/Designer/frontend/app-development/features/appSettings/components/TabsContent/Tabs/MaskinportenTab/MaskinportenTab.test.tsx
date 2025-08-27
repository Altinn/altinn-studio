import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { MaskinportenTab } from './MaskinportenTab';
import { renderWithProviders } from '../../../../../../test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';

describe('MaskinportenTab', () => {
  afterEach(jest.clearAllMocks);

  it('should check and verify if the user is logged in', async () => {
    const getIsLoggedInWithAnsattporten = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: false }));

    renderMaskinportenTab({ getIsLoggedInWithAnsattporten });
    await waitForLoggedInStatusCheckIsDone();
    await waitFor(() => expect(getIsLoggedInWithAnsattporten).toHaveBeenCalledTimes(1));
  });

  it('should display information about login and login button, if user is not logged in', async () => {
    renderMaskinportenTab();
    await waitForLoggedInStatusCheckIsDone();

    const title = getHeading(textMock('app_settings.maskinporten_tab_heading'), 3);
    expect(title).toBeInTheDocument();

    const description = getText(textMock('app_settings.maskinporten_tab_description'));
    expect(description).toBeInTheDocument();

    const loginButton = getButton(
      textMock('app_settings.maskinporten_tab_login_with_ansattporten'),
    );
    expect(loginButton).toBeInTheDocument();
  });

  it('should display content if logged in', async () => {
    const getIsLoggedInWithAnsattporten = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: true }));
    renderMaskinportenTab({ getIsLoggedInWithAnsattporten });

    await waitForLoggedInStatusCheckIsDone();

    const loginButton = queryButton(
      textMock('app_settings.maskinporten_tab_login_with_ansattporten'),
    );
    expect(loginButton).not.toBeInTheDocument();
  });

  it('should show an alert with text that no scopes are available for user', async () => {
    const getIsLoggedInWithAnsattporten = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: true }));

    const getMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const getSelectedMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderMaskinportenTab({
      getIsLoggedInWithAnsattporten,
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });

    await waitForLoggedInStatusCheckIsDone();

    expect(
      getText(textMock('app_settings.maskinporten_no_scopes_available_description')),
    ).toBeInTheDocument();
  });
});

const renderMaskinportenTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<MaskinportenTab />);
};

async function waitForLoggedInStatusCheckIsDone() {
  await waitForElementToBeRemoved(() => getText(textMock('app_settings.loading_content')));
}

const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getHeading = (name: string, level?: number): HTMLHeadingElement =>
  screen.getByRole('heading', { name, level });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
const queryButton = (name: string): HTMLButtonElement | null =>
  screen.queryByRole('button', { name });
