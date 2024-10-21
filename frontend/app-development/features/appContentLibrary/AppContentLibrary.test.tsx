import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AppContentLibrary', () => {
  it('renders the AppContentLibrary with codeLists and images resources', () => {
    renderAppContentLibrary();
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
});

const renderAppContentLibrary = () => {
  render(<AppContentLibrary />);
};
