import { screen } from '@testing-library/react';
import type { PagesConfig } from '../types/PagesProps';
import React from 'react';
import { ContentLibraryWithProvider } from './ContentLibraryWithProvider';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { mockPagesConfig } from '../../mocks/mockPagesConfig';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';

describe('ContentLibraryWithProvider', () => {
  it('renders content library with given pages', () => {
    const pages: PagesConfig = {
      codeListsWithTextResources: mockPagesConfig.codeListsWithTextResources,
      images: mockPagesConfig.images,
    };
    renderContentLibrary({ pages, heading: 'Lorem ipsum' });
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

  it('renders content library with landing page when no pages are passed', () => {
    renderContentLibrary({ pages: {}, heading: 'Lorem ipsum' });
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
    const config: ContentLibraryConfig = { pages: mockPagesConfig, heading };
    renderContentLibrary(config);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

const renderContentLibrary = (config: ContentLibraryConfig): void => {
  renderWithProviders(<ContentLibraryWithProvider {...config} />);
};
