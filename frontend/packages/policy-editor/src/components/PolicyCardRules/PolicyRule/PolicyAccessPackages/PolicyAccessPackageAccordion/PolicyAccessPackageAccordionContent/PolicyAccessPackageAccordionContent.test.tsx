import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PolicyAccessPackageAccordionContent } from './PolicyAccessPackageAccordionContent';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';

const resource: AccessPackageResource = {
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
const testEnv = 'tt02';

describe('PolicyAccessPackageAccordionContent', () => {
  afterEach(jest.clearAllMocks);

  it('should show spinner on loading', () => {
    renderPolicyAccessPackageAccordionContent();

    expect(
      screen.getByText(textMock('policy_editor.access_package_loading_services')),
    ).toBeInTheDocument();
  });

  it('should show services', async () => {
    const getAccessPackageServices = jest
      .fn()
      .mockImplementation(() => Promise.resolve([resource]));

    renderPolicyAccessPackageAccordionContent({ getAccessPackageServices });

    expect(await screen.findByText(resource.title.nb)).toBeInTheDocument();
  });

  it('should show text if package has no connected services', async () => {
    renderPolicyAccessPackageAccordionContent();

    expect(
      await screen.findByText(
        textMock('policy_editor.access_package_no_services', {
          environment: testEnv,
        }),
      ),
    ).toBeInTheDocument();
  });
});

const renderPolicyAccessPackageAccordionContent = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <PolicyAccessPackageAccordionContent
        accessPackageUrn='urn'
        accessPackageResourcesEnv={testEnv}
      />
    </ServicesContextProvider>,
  );
};
