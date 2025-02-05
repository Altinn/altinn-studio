import React from 'react';
import { OrgContentLibrary } from './OrgContentLibrary';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { SelectedContextType } from '../../context/HeaderContext';
import { useParams } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

describe('OrgContentLibrary', () => {
  beforeEach(() => {
    const selectedContext = 'some-org';
    (useParams as jest.Mock).mockReturnValue({ selectedContext });
  });

  it.each([SelectedContextType.None, SelectedContextType.All, SelectedContextType.Self])(
    'renders alert and omits library content when context is %s',
    (selectedContext) => {
      (useParams as jest.Mock).mockReturnValue({ selectedContext });
      renderWithProviders(<OrgContentLibrary />);

      const noOrgSelectedParagraph = screen.getByText(
        textMock('dashboard.org_library.alert_no_org_selected'),
      );
      expect(noOrgSelectedParagraph).toBeInTheDocument();

      const libraryTitle = screen.queryByRole('heading', {
        name: textMock('app_content_library.library_heading'),
      });
      expect(libraryTitle).not.toBeInTheDocument();
    },
  );

  it('renders the library title', () => {
    renderWithProviders(<OrgContentLibrary />);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryTitle).toBeInTheDocument();
  });

  it('renders the library landing page by default', () => {
    renderWithProviders(<OrgContentLibrary />);
    const landingPageTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    expect(landingPageTitle).toBeInTheDocument();
    const landingPageDescription = screen.getByText(
      textMock('app_content_library.landing_page.description'),
    );
    expect(landingPageDescription).toBeInTheDocument();
  });

  it('renders the code list menu element', () => {
    renderWithProviders(<OrgContentLibrary />);
    const codeListMenuElement = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListMenuElement).toBeInTheDocument();
  });
});
