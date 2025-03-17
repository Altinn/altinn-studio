import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { LibraryHeader } from './LibraryHeader';
import { render, screen } from '@testing-library/react';
import { RouterContext } from '../../contexts/RouterContext';

const navigateMock = jest.fn();

describe('LibraryHeader', () => {
  it('renders the content library header', () => {
    renderLibraryHeader();
    const libraryIcon = screen.getByRole('img');
    const libraryHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryIcon).toBeInTheDocument();
    expect(libraryHeader).toBeInTheDocument();
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
