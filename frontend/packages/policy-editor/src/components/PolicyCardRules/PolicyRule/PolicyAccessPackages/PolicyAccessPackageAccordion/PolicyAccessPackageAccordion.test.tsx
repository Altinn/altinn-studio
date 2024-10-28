import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';

const defaultAccessPackageProp = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description:
    'Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
  services: [],
  area: {
    id: 'transport-id',
    name: 'Transport og lagring',
    description: '',
    iconName: '',
    shortDescription: '',
  },
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
  logoUrl: '',
};

describe('PolicyAccessPackageAccordion', () => {
  afterEach(jest.clearAllMocks);

  it('should show text if access package contains no services', async () => {
    const user = userEvent.setup();
    render(
      <PolicyAccessPackageAccordion
        accessPackage={defaultAccessPackageProp}
        selectedLanguage='nb'
        selectPackageElement={<div />}
      />,
    );

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(
      screen.getByText(textMock('policy_editor.access_package_no_services')),
    ).toBeInTheDocument();
  });

  it('should show list of services', async () => {
    const user = userEvent.setup();

    render(
      <PolicyAccessPackageAccordion
        accessPackage={{ ...defaultAccessPackageProp, services: [resource] }}
        selectedLanguage='nb'
        selectPackageElement={<div />}
      />,
    );

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(screen.getByText(resource.title.nb)).toBeInTheDocument();
  });

  it('should show logo for services', async () => {
    const user = userEvent.setup();

    render(
      <PolicyAccessPackageAccordion
        accessPackage={{
          ...defaultAccessPackageProp,
          services: [{ ...resource, logoUrl: 'https://altinncdn.no/orgs/skd/skd.png' }],
        }}
        selectedLanguage='nb'
        selectPackageElement={<div />}
      />,
    );

    const accordionButton = screen.getByRole('button');
    await user.click(accordionButton);

    expect(screen.getByAltText(resource.hasCompetentAuthority.name.nb)).toBeInTheDocument();
  });
});
