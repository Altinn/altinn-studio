import React from 'react';
import { screen } from '@testing-library/react';
import { AppPreviewSubMenu } from './AppPreviewSubMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { useMediaQuery } from '@studio/components/src/hooks/useMediaQuery';
import { renderWithProviders } from 'app-preview/test/mocks';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const mockGetItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (...args: string[]) => mockGetItem(...args),
  },
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

jest.mock('@studio/components/src/hooks/useMediaQuery');
jest.mock('app-shared/hooks/queries');

const mockLayoutId: string = 'layout1';
const uiEditorPath: string = `/editor/${org}/${app}/${RoutePaths.UIEditor}?layout=${mockLayoutId}`;

describe('AppPreviewSubMenu', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render the back-to-editing link with text on large screens', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    (useInstanceIdQuery as jest.Mock).mockReturnValue(mockLayoutId);
    (mockGetItem as jest.Mock).mockReturnValue(mockLayoutId);

    renderAppPreviewSubMenu();

    expect(screen.getByRole('link')).toHaveAttribute('href', uiEditorPath);
    expect(screen.getByText(textMock('top_menu.preview_back_to_editing'))).toBeInTheDocument();
  });

  it('should render the back-to-editing link without text on small screens', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    (useInstanceIdQuery as jest.Mock).mockReturnValue(mockLayoutId);
    (mockGetItem as jest.Mock).mockReturnValue(mockLayoutId);

    renderAppPreviewSubMenu();

    expect(screen.getByRole('link')).toHaveAttribute('href', uiEditorPath);
    expect(
      screen.queryByText(textMock('top_menu.preview_back_to_editing')),
    ).not.toBeInTheDocument();
  });
});

const renderAppPreviewSubMenu = () => {
  return renderWithProviders()(<AppPreviewSubMenu />);
};
