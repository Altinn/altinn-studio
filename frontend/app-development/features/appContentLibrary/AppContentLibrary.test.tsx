import React from 'react';
import { screen } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';

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
  renderWithProviders()(<AppContentLibrary />);
};
