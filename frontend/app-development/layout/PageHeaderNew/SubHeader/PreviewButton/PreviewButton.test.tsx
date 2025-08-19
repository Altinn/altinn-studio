import React from 'react';
import { screen } from '@testing-library/react';
import { PreviewButton } from './PreviewButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/components-legacy';
import { PageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { pageHeaderContextMock, previewContextMock } from 'app-development/test/headerMocks';
import { PreviewContext } from 'app-development/contexts/PreviewContext';
import { app, org } from '@studio/testing/testids';

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');
jest.mock('app-shared/navigation/PackagesRouter');

const layoutMock: string = 'layout1';

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: layoutMock };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const urlMock: string = `/preview/${org}/${app}/`;
const mockGetPackageNavigationUrl = jest.fn().mockImplementation(() => urlMock);

(PackagesRouter as jest.Mock).mockImplementation(() => ({
  getPackageNavigationUrl: mockGetPackageNavigationUrl,
}));

describe('PreviewButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render the button with text on a large screen', () => {
    renderPreviewButton();

    expect(screen.getByText(textMock('top_menu.preview'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `${urlMock}?layout=${layoutMock}`);
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderPreviewButton();

    expect(screen.queryByText(textMock('top_menu.preview'))).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `${urlMock}?layout=${layoutMock}`);
  });
});

const renderPreviewButton = () => {
  renderWithProviders()(
    <PageHeaderContext.Provider value={{ ...pageHeaderContextMock }}>
      <PreviewContext.Provider value={previewContextMock}>
        <PreviewButton />
      </PreviewContext.Provider>
    </PageHeaderContext.Provider>,
  );
};
