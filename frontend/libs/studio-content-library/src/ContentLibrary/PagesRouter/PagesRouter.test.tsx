import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PagesRouter } from './PagesRouter';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RouterContext } from '../../contexts/RouterContext';

const navigateMock = jest.fn();

describe('PagesRouter', () => {
  it('renders the pages as navigation titles', () => {
    renderPagesRouter();
    const codeListNavTitle = screen.getByText(textMock('app_content_library.code_lists.page_name'));
    const imagesNavTitle = screen.getByText(textMock('app_content_library.images.page_name'));
    expect(codeListNavTitle).toBeInTheDocument();
    expect(imagesNavTitle).toBeInTheDocument();
  });

  it('renders currentPage as selected in the pageRouter list', () => {});

  it('calls navigate from RouterContext when clicking on a page that is not selected', async () => {
    const user = userEvent.setup();
    renderPagesRouter();
    const imagesNavTitle = screen.getByText(textMock('app_content_library.images.page_name'));
    await user.click(imagesNavTitle);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('images');
  });
});

const renderPagesRouter = () => {
  //render(<PagesRouter pageNames={['landingPage', 'codeList', 'images']}/>)
  render(
    <RouterContext.Provider value={{ currentPage: 'codeList', navigate: navigateMock }}>
      <PagesRouter pageNames={['codeList', 'images']} />
    </RouterContext.Provider>,
  );
};
