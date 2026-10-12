import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen } from '@testing-library/react';
import { PreviewButton } from './PreviewButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/hooks';
import { PageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { pageHeaderContextMock, previewContextMock } from 'app-development/test/headerMocks';
import { PreviewContext } from 'app-shared/contexts/PreviewContext';
import { app, org } from '@studio/testing/testids';

vi.mock('@studio/hooks/src/hooks/useMediaQuery');
vi.mock('app-shared/navigation/PackagesRouter');

const layoutMock: string = 'layout1';

const mockSetSearchParams = vi.fn();
const mockSearchParams = { layout: layoutMock };
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const urlMock: string = `/preview/${org}/${app}/`;
const mockGetPackageNavigationUrl = vi.fn().mockImplementation(() => urlMock);

(PackagesRouter as Mock).mockImplementation(function () {
  return {
    getPackageNavigationUrl: mockGetPackageNavigationUrl,
  };
});

describe('PreviewButton', () => {
  afterEach(() => vi.clearAllMocks());

  it('should render the button with text on a large screen', () => {
    renderPreviewButton();

    expect(screen.getByText(textMock('top_menu.preview'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `${urlMock}?layout=${layoutMock}`);
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as Mock).mockReturnValue(true);
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
