import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PagesRouter } from './PagesRouter';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RouterContext } from '../../../contexts/RouterContext';
import { PageName } from '../../../types/PageName';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import type { ContentLibraryConfig } from '../../../types/ContentLibraryConfig';
import { mockPagesConfig } from '../../../../mocks/mockPagesConfig';

const navigateMock = jest.fn();

describe('PagesRouter', () => {
  it('renders the pages as navigation titles', () => {
    renderPagesRouter();
    const codeListNavTitle = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists_with_text_resources.page_name'),
    });
    const imagesNavTitle = screen.getByRole('tab', {
      name: textMock('app_content_library.images.page_name'),
    });
    expect(codeListNavTitle).toBeInTheDocument();
    expect(imagesNavTitle).toBeInTheDocument();
  });

  it('calls navigate from RouterContext when clicking on a page that is not selected', async () => {
    const user = userEvent.setup();
    renderPagesRouter();
    const imagesNavTitle = screen.getByRole('tab', {
      name: textMock('app_content_library.images.page_name'),
    });
    await user.click(imagesNavTitle);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(PageName.Images);
  });
});

const renderPagesRouter = (
  config: ContentLibraryConfig = {
    heading: 'Test library',
    pages: mockPagesConfig,
  },
) => {
  renderWithProviders(
    <RouterContext.Provider
      value={{ currentPage: PageName.CodeListsWithTextResources, navigate: navigateMock }}
    >
      <PagesRouter config={config} />
    </RouterContext.Provider>,
  );
};
