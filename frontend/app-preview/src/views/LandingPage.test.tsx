import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { userEvent } from '@testing-library/user-event';
import { useMediaQuery } from '@studio/components/src/hooks/useMediaQuery';
import { renderWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { userMock } from 'app-development/test/userMock';

jest.mock('@studio/components/src/hooks/useMediaQuery');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

const mockGetItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (...args: string[]) => mockGetItem(...args),
  },
});

describe('LandingPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('should display a spinner initially when loading user', () => {
    renderLandingPage();

    expect(screen.getByTitle(textMock('preview.loading_page'))).toBeInTheDocument();
  });

  it('should render the app title if on a large screen', async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    expect(screen.getByText('testApp')).toBeInTheDocument();
  });

  it('should not render the app title if on a small screen', async () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    expect(screen.queryByText('testApp')).not.toBeInTheDocument();
  });

  it('should display the user profile menu', async () => {
    const user = userEvent.setup();

    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderLandingPage({
      getUser: jest.fn().mockImplementation(() => Promise.resolve(userMock)),
    });

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      }),
    );

    expect(
      screen.getByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
  });

  it('should display the iframe with the correct src', async () => {
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    const iframe = screen.getByTitle(textMock('preview.title'));
    expect(iframe).toHaveAttribute('src', `/app-specific-preview/${org}/${app}?`);
  });
});

const renderLandingPage = async (queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders(queries)(<LandingPage />);
};
