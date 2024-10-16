import React from 'react';
import { ContentLibrary } from './ContentLibrary';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockPagesConfig } from '../../mocks/mockPagesConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RouterContext } from '../contexts/RouterContext';
import type { PageName } from '../types/PageName';

const navigateMock = jest.fn();

describe('ContentLibrary', () => {
  it('renders the ContentLibrary with landingPage by default', () => {
    renderContentLibrary();
    const libraryHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.page_name'),
    });
    const landingPageTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const infoBox = screen.queryByTitle(textMock('app_content_library.info_box.title'));
    expect(libraryHeader).toBeInTheDocument();
    expect(landingPageTitle).toBeInTheDocument();
    expect(infoBox).not.toBeInTheDocument();
  });

  it('renders the ContentLibrary with codeList content when acting as currentPage', () => {
    renderContentLibrary('codeList');
    const codeListTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    const infoBox = screen.getByTitle(textMock('app_content_library.info_box.title'));
    expect(codeListTitle).toBeInTheDocument();
    expect(infoBox).toBeInTheDocument();
  });

  it('navigates to images content when clicking on images navigation', async () => {
    const user = userEvent.setup();
    renderContentLibrary();
    const imagesPageNavigation = screen.getByText(textMock('app_content_library.images.page_name'));
    await user.click(imagesPageNavigation);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('images');
  });
});

const renderContentLibrary = (currentPage: PageName = undefined) => {
  render(
    <RouterContext.Provider value={{ currentPage, navigate: navigateMock }}>
      <ContentLibrary pages={mockPagesConfig} />
    </RouterContext.Provider>,
  );
};
