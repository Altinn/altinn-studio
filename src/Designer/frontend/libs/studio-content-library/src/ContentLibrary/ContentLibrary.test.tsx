import React from 'react';
import type { ContentLibraryProps } from './ContentLibrary';
import { ContentLibrary } from './ContentLibrary';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockPagesConfig } from '../../mocks/mockPagesConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RouterContext } from '../contexts/RouterContext';
import { PageName } from '../types/PageName';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { getPage } from '../pages';
import type { PagesConfig } from '../types/PagesProps';

const navigateMock = jest.fn();

// Test data:
const heading = 'The test library';
const defaultProps: ContentLibraryProps = {
  heading,
  pages: mockPagesConfig,
};

describe('ContentLibrary', () => {
  it('renders the ContentLibrary with landingPage by default', () => {
    renderContentLibrary();
    const libraryHeader = screen.getByRole('heading', { name: heading });
    const landingPageTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    expect(libraryHeader).toBeInTheDocument();
    expect(landingPageTitle).toBeInTheDocument();
  });

  it.each([PageName.CodeLists, PageName.CodeListsWithTextResources, PageName.Images])(
    'Renders the %s when that page is selected',
    (pageName) => {
      const page = getPage(pageName);
      renderContentLibrary(pageName);
      const pageTitle = screen.getByRole('heading', { name: textMock(page.titleKey) });
      expect(pageTitle).toBeInTheDocument();
    },
  );

  it('navigates to images content when clicking on images navigation', async () => {
    const user = userEvent.setup();
    renderContentLibrary();
    const imagesPageNavigation = screen.getByText(textMock('app_content_library.images.page_name'));
    await user.click(imagesPageNavigation);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(PageName.Images);
  });

  it('renders 404 not found page when pageName without supported implementation is passed', () => {
    const pages: PagesConfig = { ...mockPagesConfig, [PageName.Images]: undefined };
    renderContentLibrary(PageName.Images, { pages });
    const notFoundPageTitle = screen.getByRole('heading', { name: '404 Page Not Found' });
    expect(notFoundPageTitle).toBeInTheDocument();
  });
});

const renderContentLibrary = (
  currentPage: PageName = undefined,
  props?: Partial<ContentLibraryProps>,
): void => {
  renderWithProviders(
    <RouterContext.Provider value={{ currentPage, navigate: navigateMock }}>
      <ContentLibrary {...defaultProps} {...props} />
    </RouterContext.Provider>,
  );
};
