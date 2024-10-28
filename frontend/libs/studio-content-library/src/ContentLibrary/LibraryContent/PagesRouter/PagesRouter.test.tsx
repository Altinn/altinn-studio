import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PagesRouter } from './PagesRouter';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RouterContext } from '../../../contexts/RouterContext';
import type { PageName } from '../../../types/PageName';
import { BrowserRouter } from 'react-router-dom';

const navigateMock = jest.fn();

describe('PagesRouter', () => {
  it('renders the pages as navigation titles', () => {
    renderPagesRouter();
    const codeListNavTitle = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists.page_name'),
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
    expect(navigateMock).toHaveBeenCalledWith('images');
  });
});

const renderPagesRouter = (pageNames: PageName[] = ['codeList', 'images']) => {
  render(
    <BrowserRouter>
      <RouterContext.Provider value={{ currentPage: 'codeList', navigate: navigateMock }}>
        <PagesRouter pageNames={pageNames} />
      </RouterContext.Provider>
    </BrowserRouter>,
  );
};
