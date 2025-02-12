import React from 'react';
import { OrgContentLibrary } from './OrgContentLibrary';
import type { RenderResult } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ProviderData } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import { SelectedContextType } from '../../context/HeaderContext';
import { Route, Routes } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const mockOrgPath: string = '/testOrg';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('OrgContentLibrary', () => {
  beforeEach(jest.clearAllMocks);

  it('renders a spinner when waiting for code lists', () => {
    renderOrgContentLibrary({ initialEntries: [mockOrgPath] });
    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('Renders an error message when the code lists query fails', async () => {
    const getCodeListsForOrg = () => Promise.reject(new Error('Test error'));
    renderOrgContentLibrary({
      queries: { getCodeListsForOrg },
      queryClient: createQueryClientMock(),
      initialEntries: [mockOrgPath],
    });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);
    const errorMessage = screen.getByText(textMock('dashboard.org_library.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it.each([SelectedContextType.None, SelectedContextType.All, SelectedContextType.Self])(
    'renders alert and omits library content when context is %s',
    (selectedContext) => {
      renderOrgContentLibrary({ initialEntries: ['/' + selectedContext] });

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

  it('renders the library title', async () => {
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryTitle).toBeInTheDocument();
  });

  it('renders the library landing page by default', () => {
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
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
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
    const codeListMenuElement = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListMenuElement).toBeInTheDocument();
  });
});

function renderOrgContentLibrary(providerData: ProviderData): RenderResult {
  return renderWithProviders(
    <Routes>
      <Route path=':selectedContext' element={<OrgContentLibrary />} />
    </Routes>,
    providerData,
  );
}
