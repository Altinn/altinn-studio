import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { Maskinporten } from './Maskinporten';
import { renderWithProviders } from '../../../../../../../../test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';

describe('Maskinporten', () => {
  const consoleLogMock = jest.fn();
  const originalConsoleLog = console.log;
  beforeEach(() => {
    console.log = consoleLogMock;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('should check and verify if the user is logged in', async () => {
    const getIsLoggedInWithAnsattportenMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve(false));

    renderMaskinporten({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
      },
    });
    await waitForLoggedInStatusCheckIsDone();
    await waitFor(() => expect(getIsLoggedInWithAnsattportenMock).toHaveBeenCalledTimes(1));
  });

  it('should display information about login and login button, if user is not logged in', async () => {
    renderMaskinporten({});
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
      .mockImplementation(() => Promise.resolve(true));
    renderMaskinporten({
      queries: {
        getIsLoggedInWithAnsattporten: getIsLoggedInWithAnsattportenMock,
      },
    });

    await waitForLoggedInStatusCheckIsDone();

    const temporaryLoggedInContent = screen.getByText('View when logged in comes here');
    expect(temporaryLoggedInContent).toBeInTheDocument();
  });

  it('should invoke "handleLoginWithAnsattPorten" when login button is clicked', async () => {
    const user = userEvent.setup();
    renderMaskinporten({});
    await waitForLoggedInStatusCheckIsDone();

    const loginButton = screen.getByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });

    await user.click(loginButton);

    expect(consoleLogMock).toHaveBeenCalledWith(
      'Will be implemented in next iteration when backend is ready',
    );
  });
});

type RenderMaskinporten = {
  queries?: Partial<typeof queriesMock>;
};
const renderMaskinporten = ({ queries = queriesMock }: RenderMaskinporten) => {
  const queryClient = createQueryClientMock();
  renderWithProviders({ ...queriesMock, ...queries }, queryClient)(<Maskinporten />);
};

async function waitForLoggedInStatusCheckIsDone() {
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
}
