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

  it('renders information to select org when context is none', () => {
    const selectedContext = SelectedContextType.None;
    (useParams as jest.Mock).mockReturnValue({ selectedContext });
    renderWithProviders(<OrgContentLibrary />);
    const noOrgSelectedAlert = screen.getByText(textMock('dashboard.org_library.no_org_selected'));
    expect(noOrgSelectedAlert).toBeInTheDocument();
  });
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
