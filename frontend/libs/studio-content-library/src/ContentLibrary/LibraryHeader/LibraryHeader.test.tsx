import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { LibraryHeader } from './LibraryHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterContext } from '../../contexts/RouterContext';

const navigateMock = jest.fn();

describe('LibraryHeader', () => {
  it('renders the contentLibrary header', () => {
    renderLibraryHeader();
    const libraryIcon = screen.getByRole('img');
    const libraryHeader = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryIcon).toBeInTheDocument();
    expect(libraryHeader).toBeInTheDocument();
  });
});

const renderLibraryHeader = () => {
  render(
    <RouterContext.Provider value={{ currentPage: 'codeList', navigate: navigateMock }}>
      <LibraryHeader />
    </RouterContext.Provider>,
  );
};
