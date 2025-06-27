import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { LibraryHeader } from './LibraryHeader';
import { render, screen } from '@testing-library/react';
import { RouterContext } from '../../contexts/RouterContext';
import { DASHBOARD_BASENAME, ORG_LIBRARY_BASENAME } from 'app-shared/constants';

const navigateMock = jest.fn();

const originalUrl = location.href;
const originalHistoryData = history.state;

describe('LibraryHeader', () => {
  afterEach(() => {
    replaceCurrentUrl(originalUrl);
  });

  it('renders header icon', () => {
    renderLibraryHeader();
    const libraryIcon = screen.getByRole('img');
    expect(libraryIcon).toBeInTheDocument();
  });

  it('renders library header with app text as default', () => {
    renderLibraryHeader();
    const appLibraryHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(appLibraryHeader).toBeInTheDocument();
  });

  it('renders library header with org text for org paths', () => {
    const orgPath = `${DASHBOARD_BASENAME}${ORG_LIBRARY_BASENAME}/test-org`;
    replaceCurrentUrl(orgPath);
    renderLibraryHeader();
    const orgLibraryHeader = screen.getByRole('heading', {
      name: textMock('org_content_library.library_heading'),
    });
    expect(orgLibraryHeader).toBeInTheDocument();
  });

  it('renders the content library header with isBeta class', () => {
    renderLibraryHeader();
    const libraryHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryHeader).toHaveClass('isBeta');
  });
});

const renderLibraryHeader = () => {
  render(
    <RouterContext.Provider value={{ currentPage: 'codeList', navigate: navigateMock }}>
      <LibraryHeader />
    </RouterContext.Provider>,
  );
};

const replaceCurrentUrl = (newUrl: string) => {
  history.replaceState(originalHistoryData, '', newUrl);
};
