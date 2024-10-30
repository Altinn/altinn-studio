import { screen } from '@testing-library/react';
import type { PagesConfig } from '../types/PagesProps';
import { ResourceContentLibraryImpl } from './ContentResourceLibraryImpl';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithBrowserRouter } from '../../test-utils/renderWithBrowserRouter';

describe('ContentResourceLibraryImpl', () => {
  it('renders ContentResourceLibraryImpl with given pages', () => {
    const pagesConfig: PagesConfig = {
      codeList: {
        props: {
          codeLists: [],
          onUpdateCodeList: () => {},
        },
      },
      images: {
        props: {
          images: [],
          onUpdateImage: () => {},
        },
      },
    };
    renderContentResourceLibraryImpl(pagesConfig);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = screen.getByText(
      textMock('app_content_library.code_lists.page_name'),
    );
    const imagesMenuElement = screen.getByText(textMock('app_content_library.images.page_name'));
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).toBeInTheDocument();
    expect(imagesMenuElement).toBeInTheDocument();
  });

  it('renders ContentResourceLibraryImpl with landingPage when no pages are passed', () => {
    renderContentResourceLibraryImpl({});
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = screen.queryByText(
      textMock('app_content_library.code_lists.page_name'),
    );
    const imagesMenuElement = screen.queryByText(textMock('app_content_library.images.page_name'));
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).not.toBeInTheDocument();
    expect(imagesMenuElement).not.toBeInTheDocument();
  });
});

const renderContentResourceLibraryImpl = (pages: PagesConfig) => {
  const contentResourceLibraryImpl = new ResourceContentLibraryImpl({ pages });
  const { getContentResourceLibrary } = contentResourceLibraryImpl;
  renderWithBrowserRouter(getContentResourceLibrary());
};
