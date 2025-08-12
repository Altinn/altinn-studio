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
import userEvent from '@testing-library/user-event';

const skdResource: AccessPackageResource = {
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

const navResource: AccessPackageResource = {
  identifier: 'navogbetaling',
  title: {
    nb: 'Nav og betaling',
    nn: 'Nav og betaling',
    en: 'Nav og betaling',
  },
  hasCompetentAuthority: {
    name: {
      nb: 'NAV',
      nn: 'NAV',
      en: 'NAV',
    },
    organization: '889640782',
    orgcode: 'nav',
  },
  logoUrl: '',
};

const prodResource: AccessPackageResource = {
  identifier: 'prodresource',
  title: {
    nb: 'Prod resource',
    nn: 'Prod resource',
    en: 'Prod resource',
  },
  hasCompetentAuthority: {
    name: {
      nb: 'NAV',
      nn: 'NAV',
      en: 'NAV',
    },
    organization: '974760673',
    orgcode: 'brg',
  },
  logoUrl: '',
};

const accessPackageResources = [skdResource, navResource];

const testEnv = 'tt02';

describe('PolicyAccessPackageAccordionContent', () => {
  afterEach(jest.clearAllMocks);

  it('should show spinner on loading', () => {
    renderPolicyAccessPackageAccordionContent();

    expect(
      screen.getByLabelText(textMock('policy_editor.access_package_loading_services')),
    ).toBeInTheDocument();
  });

  it('should show services', async () => {
    const getAccessPackageServices = jest
      .fn()
      .mockImplementation(() => Promise.resolve(accessPackageResources));

    renderPolicyAccessPackageAccordionContent({ getAccessPackageServices });

    expect(await screen.findByText(skdResource.title.nb)).toBeInTheDocument();
  });

  it('should show services of selected environment', async () => {
    const user = userEvent.setup();

    const getAccessPackageServices = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(accessPackageResources))
      .mockImplementationOnce(() => Promise.resolve([prodResource]));

    renderPolicyAccessPackageAccordionContent({ getAccessPackageServices });

    // wait for services to load
    await screen.findByText(skdResource.title.nb);

    const envSelect = screen.getByLabelText(textMock('policy_editor.access_package_select_env'));
    await user.selectOptions(envSelect, textMock('policy_editor.access_package_environment_prod'));

    expect(await screen.findByText(prodResource.title.nb)).toBeInTheDocument();
  });

  it('should only show services of selected service owner', async () => {
    const user = userEvent.setup();

    const getAccessPackageServices = jest
      .fn()
      .mockImplementation(() => Promise.resolve(accessPackageResources));

    renderPolicyAccessPackageAccordionContent({ getAccessPackageServices });

    // wait for services to load
    await screen.findByText(skdResource.title.nb);

    const orgSelect = screen.getByLabelText(textMock('policy_editor.access_package_select_org'));
    await user.selectOptions(orgSelect, navResource.hasCompetentAuthority.orgcode);

    expect(screen.getByText(navResource.title.nb)).toBeInTheDocument();
    expect(screen.queryByText(skdResource.title.nb)).not.toBeInTheDocument();
  });

  it('should set service owner filter to all service owners when env is changed and selected org has no services in selected env', async () => {
    const user = userEvent.setup();

    const getAccessPackageServices = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(accessPackageResources))
      .mockImplementationOnce(() => Promise.resolve([prodResource]));

    renderPolicyAccessPackageAccordionContent({ getAccessPackageServices });

    // wait for services to load
    await screen.findByText(skdResource.title.nb);

    const orgSelect = screen.getByLabelText(textMock('policy_editor.access_package_select_org'));
    await user.selectOptions(orgSelect, navResource.hasCompetentAuthority.orgcode);

    const envSelect = screen.getByLabelText(textMock('policy_editor.access_package_select_env'));
    await user.selectOptions(envSelect, textMock('policy_editor.access_package_environment_prod'));

    // wait for services to load
    await screen.findByText(prodResource.title.nb);

    expect(orgSelect).toHaveValue('');
  });

  it('should show text if package has no connected services', async () => {
    renderPolicyAccessPackageAccordionContent();

    expect(
      await screen.findByText(
        textMock('policy_editor.access_package_no_services', {
          environment: testEnv.toUpperCase(),
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
      <PolicyAccessPackageAccordionContent accessPackageUrn='urn' />
    </ServicesContextProvider>,
  );
};
