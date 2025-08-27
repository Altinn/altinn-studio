import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { userEvent } from '@testing-library/user-event';
import { useMediaQuery } from 'libs/studio-components-legacy/src/hooks/useMediaQuery';
import { renderWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { userMock } from 'app-development/test/userMock';
import { typedLocalStorage } from 'libs/studio-pure-functions/src';
import { layoutSet3SubformNameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

jest.mock('libs/studio-components-legacy/src/hooks/useMediaQuery');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

jest.mock('app-shared/api/mutations', () => ({
  createPreviewInstance: jest.fn().mockReturnValue(Promise.resolve({ id: 1 })),
}));

const mockGetItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (...args: string[]) => mockGetItem(...args),
  },
});

describe('LandingPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('layoutSet/' + app);
  });

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
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
  });

  it('should display the iframe with the correct src', async () => {
    renderLandingPage();

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    const iframe = screen.getByTitle(textMock('preview.title'));
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining(`/app-specific-preview/${org}/${app}?#/instance/`),
    );
  });

  it('should display a warning message when previewing a subform', async () => {
    typedLocalStorage.setItem('layoutSet/' + app, layoutSet3SubformNameMock);
    renderLandingPage({
      getLayoutSets: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ sets: [{ id: layoutSet3SubformNameMock, type: 'subform' }] }),
        ),
    });

    await waitForElementToBeRemoved(screen.queryByTitle(textMock('preview.loading_page')));

    expect(
      screen.getByText(textMock('ux_editor.preview.subform_unsupported_warning')),
    ).toBeInTheDocument();
  });
});

const renderLandingPage = async (queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders(queries)(<LandingPage />);
};
