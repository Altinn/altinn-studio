import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { Maskinporten } from './Maskinporten';
import { renderWithProviders } from '../../../../../../../../test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';

jest.mock('app-shared/api/paths');

describe('Maskinporten', () => {
  it('should check and verify if the user is logged in', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: false }));

    renderMaskinporten({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
      },
    });
    await waitForLoggedInStatusCheckIsDone();
    await waitFor(() => expect(getIsLoggedInWithAnsattportenMock).toHaveBeenCalledTimes(1));
  });

  it('should display information about login and login button, if user is not logged in', async () => {
    renderMaskinporten();
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
    renderMaskinporten({
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

  it('should invoke "handleLoginWithAnsattPorten" when login button is clicked', async () => {
    // jsdom does not support .href navigation, therefore this mock is needed.
    const hrefMock = mockWindowLocationHref();

    const user = userEvent.setup();
    renderMaskinporten();
    await waitForLoggedInStatusCheckIsDone();

    const loginButton = screen.getByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });

    await user.click(loginButton);
    expect(hrefMock).toHaveBeenCalledTimes(1);
  });

  it('should show an alert with text that no scopes are available for user', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ isLoggedIn: true }));

    const mockGetMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderMaskinporten({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
        getMaskinportenScopes: mockGetMaskinportenScopes,
      },
    });

    await waitForLoggedInStatusCheckIsDone();

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_no_scopes_available')),
    ).toBeInTheDocument();
  });
});

type RenderMaskinporten = {
  queries?: Partial<typeof queriesMock>;
};
const renderMaskinporten = ({ queries = queriesMock }: RenderMaskinporten = {}) => {
  const queryClient = createQueryClientMock();
  renderWithProviders({ ...queriesMock, ...queries }, queryClient)(<Maskinporten />);
};

async function waitForLoggedInStatusCheckIsDone() {
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
}

function mockWindowLocationHref(): jest.Mock {
  const hrefMock = jest.fn();
  delete window.location;
  window.location = { href: '' } as Location;
  Object.defineProperty(window.location, 'href', {
    set: hrefMock,
  });

  return hrefMock;
}
