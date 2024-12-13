import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const defaultAccessPackageProp = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description:
    'Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
};

const resource = {
  identifier: 'kravogbetaling',
  title: {
    nb: 'Krav og betaling',
    nn: 'Krav og betaling',
    en: 'Krav og betaling',
  },
  hasCompetentAuthority: {
    name: {
      nb: 'Skatteetaten',
      nn: 'Skatteetaten',
      en: 'Skatteetaten',
    },
    organization: '974761076',
    orgcode: 'skd',
  },
  logoUrl: 'https://altinncdn.no/orgs/skd/skd.png',
};

describe('PolicyAccessPackageAccordion', () => {
  afterEach(jest.clearAllMocks);

  it('should show text if access package contains no services', async () => {
    const user = userEvent.setup();
    renderAccordion();

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(
      screen.getByText(textMock('policy_editor.access_package_no_services')),
    ).toBeInTheDocument();
  });

  it('should show list of services', async () => {
    const user = userEvent.setup();
    const getAccessPackageServices = jest
      .fn()
      .mockImplementation(() => Promise.resolve([resource]));

    renderAccordion({ getAccessPackageServices });

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(screen.getByText(resource.title.nb)).toBeInTheDocument();
  });

  it('should show logo for services', async () => {
    const user = userEvent.setup();
    const getAccessPackageServices = jest
      .fn()
      .mockImplementation(() => Promise.resolve([resource]));

    renderAccordion({ getAccessPackageServices });

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(screen.getByAltText(resource.hasCompetentAuthority.name.nb)).toBeInTheDocument();
  });
});

const renderAccordion = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <PolicyAccessPackageAccordion
        accessPackage={defaultAccessPackageProp}
        selectedLanguage='nb'
        selectPackageElement={<div />}
      />
      ,
    </ServicesContextProvider>,
  );
};
