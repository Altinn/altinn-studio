import React from 'react';
import type { LibraryHeaderProps } from './LibraryHeader';
import { LibraryHeader } from './LibraryHeader';
import { render, screen } from '@testing-library/react';
import { RouterContext } from '../../contexts/RouterContext';

const navigateMock = jest.fn();

// Test data:
const children = 'The test library';
const defaultProps: LibraryHeaderProps = { children };

describe('LibraryHeader', () => {
  it('renders header icon', () => {
    renderLibraryHeader();
    const libraryIcon = screen.getByRole('img');
    expect(libraryIcon).toBeInTheDocument();
  });

  it('renders library header with the given text', () => {
    renderLibraryHeader();
    expect(screen.getByRole('heading', { name: children })).toBeInTheDocument();
  });

  it('renders the content library header with isBeta class', () => {
    renderLibraryHeader();
    expect(screen.getByRole('heading')).toHaveClass('isBeta');
  });
});

const renderLibraryHeader = (): void => {
  render(
    <RouterContext.Provider
      value={{ currentPage: 'codeListsWithTextResources', navigate: navigateMock }}
    >
      <LibraryHeader {...defaultProps} />
    </RouterContext.Provider>,
  );
};
