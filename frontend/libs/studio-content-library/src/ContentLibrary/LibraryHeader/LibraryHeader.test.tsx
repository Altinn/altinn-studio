import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { LibraryHeader } from './LibraryHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterContext } from '../../contexts/RouterContext';

const navigateMock = jest.fn();

describe('LibraryHeader', () => {
  it('renders the landingPage header', () => {
    renderLibraryHeader();
    const landingPageIcon = screen.getByRole('img');
    const landingPageHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.page_name'),
    });
    expect(landingPageIcon).toBeInTheDocument();
    expect(landingPageHeader).toBeInTheDocument();
  });

  it('calls navigate from useRouterContext when clicking on the header', async () => {
    const user = userEvent.setup();
    renderLibraryHeader();
    const landingPageHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.page_name'),
    });
    await user.click(landingPageHeader);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('landingPage');
  });
});

const renderLibraryHeader = () => {
  render(
    <RouterContext.Provider value={{ currentPage: 'codeList', navigate: navigateMock }}>
      <LibraryHeader />
    </RouterContext.Provider>,
  );
};
