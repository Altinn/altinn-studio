import { screen } from '@testing-library/react';
import type { PagesConfig } from '../types/PagesProps';
import { ResourceContentLibraryImpl } from './ContentResourceLibraryImpl';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { mockPagesConfig } from '../../mocks/mockPagesConfig';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';
import type { ContentLibraryRouter } from '../types/ContentLibraryRouter';
import { PageName } from '../types/PageName';
import React from 'react';

const router: ContentLibraryRouter = {
  location: PageName.LandingPage,
  navigate: jest.fn(),
  renderLink: (_, props) => <a {...props} />,
};

describe('ContentResourceLibraryImpl', () => {
  it('renders ContentResourceLibraryImpl with given pages', () => {
    const pages: PagesConfig = {
      codeListsWithTextResources: mockPagesConfig.codeListsWithTextResources,
      images: mockPagesConfig.images,
    };
    renderContentResourceLibraryImpl({ pages, heading: 'Lorem ipsum', router });
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = screen.getByText(
      textMock('app_content_library.code_lists_with_text_resources.page_name'),
    );
    const imagesMenuElement = screen.getByText(textMock('app_content_library.images.page_name'));
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).toBeInTheDocument();
    expect(imagesMenuElement).toBeInTheDocument();
  });

  it('renders ContentResourceLibraryImpl with landingPage when no pages are passed', () => {
    renderContentResourceLibraryImpl({ pages: {}, heading: 'Lorem ipsum', router });
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = screen.queryByText(
      textMock('app_content_library.code_lists_with_text_resources.page_name'),
    );
    const imagesMenuElement = screen.queryByText(textMock('app_content_library.images.page_name'));
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).not.toBeInTheDocument();
    expect(imagesMenuElement).not.toBeInTheDocument();
  });

  it('Renders the given heading', () => {
    const heading = 'The test library';
    const config: ContentLibraryConfig = { pages: mockPagesConfig, heading, router };
    renderContentResourceLibraryImpl(config);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

const renderContentResourceLibraryImpl = (config: ContentLibraryConfig): void => {
  const contentResourceLibraryImpl = new ResourceContentLibraryImpl(config);
  const { getContentResourceLibrary } = contentResourceLibraryImpl;
  renderWithProviders(getContentResourceLibrary());
};
