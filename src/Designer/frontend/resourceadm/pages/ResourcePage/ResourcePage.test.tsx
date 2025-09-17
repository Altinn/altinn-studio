import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { ResourcePage } from './ResourcePage';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Resource, ResourceTypeOption } from 'app-shared/types/ResourceAdm';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter, useParams } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockResource1: Resource = {
  identifier: 'r1',
  title: { nb: 'ressurs 1', nn: 'res1', en: 'resource 1' },
  description: { nb: 'Beskrivelse av resource 1', nn: 'Mock', en: 'Description of test resource' },
  keywords: [
    { language: 'nb', word: 'Key1 ' },
    { language: 'nb', word: 'Key 2' },
  ],
  visible: false,
  resourceReferences: [
    { reference: '1', referenceType: 'ServiceCode', referenceSource: 'Altinn2' },
    { reference: '2', referenceType: 'ServiceEditionCode', referenceSource: 'Altinn2' },
  ],
  delegable: false,
  resourceType: 'GenericAccessResource',
  status: 'Completed',
  contactPoints: [{ category: 'test', contactPage: '', email: '', telephone: '' }],
  availableForType: ['Company'],
};

const mockResource2: Resource = {
  identifier: 'r2',
  title: { nb: '', nn: '', en: '' },
};

const mockOrg: string = 'test';
const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: jest.fn().mockImplementation(() => {
    return {
      pageType: 'about',
      resourceId: mockResource1.identifier,
      org: mockOrg,
    };
  }),
}));

describe('ResourcePage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches validate policy on mount', () => {
    renderResourcePage();
    expect(queriesMock.getValidatePolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches resource on mount', () => {
    renderResourcePage();
    expect(queriesMock.getResource).toHaveBeenCalledTimes(1);
  });

  it('displays left navigation bar on mount', () => {
    renderResourcePage();
    expect(
      screen.getByRole('tab', { name: textMock('resourceadm.left_nav_bar_about') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('resourceadm.left_nav_bar_policy') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: textMock('resourceadm.left_nav_bar_deploy') }),
    ).toBeInTheDocument();
  });

  it('displays the about resource page spinner when loading page first time', () => {
    renderResourcePage();

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_spinner')),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('resourceadm.about_resource_title'),
        level: 1,
      }),
    ).not.toBeInTheDocument();
  });

  it('displays migrate tab in left navigation bar when resource reference is present in resource and resource is GenericAccessResource', async () => {
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource1));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.getByRole('tab', { name: textMock('resourceadm.left_nav_bar_migration') }),
    ).toBeInTheDocument();
  });

  it('does not display migrate tab in left navigation bar when resource reference is present in resource and resource is not GenericAccessResource', async () => {
    const getResource = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve<Resource>({ ...mockResource1, resourceType: 'Consent' }),
      );

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.queryByRole('tab', { name: textMock('resourceadm.left_nav_bar_migration') }),
    ).not.toBeInTheDocument();
  });

  it('does not display migrate tab in left navigation bar when resource reference is not in resource', async () => {
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource2));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.queryByRole('tab', { name: textMock('resourceadm.left_nav_bar_migration') }),
    ).not.toBeInTheDocument();
  });

  it('navigates to migration page clicking the migration tab', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource1));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    const migrationTab = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_migration'),
    });
    await user.click(migrationTab);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `/${mockOrg}/${mockOrg}-resources/resource/${mockResource1.identifier}/migration`,
    );
  });

  it('should navigate to policy page from modal when resource has errors', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource2));
    const getValidateResource = jest.fn().mockImplementation(() => Promise.reject(null));

    renderResourcePage({ getResource, getValidateResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    const policyButton = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_policy'),
    });
    await user.click(policyButton);

    const navigateButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_move_on'),
    });
    await user.click(navigateButton);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `/${mockOrg}/${mockOrg}-resources/resource/${mockResource1.identifier}/policy`,
    );
  });

  it('should navigate to policy page when resource has no errors', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource1));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    const policyButton = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_policy'),
    });
    await user.click(policyButton);

    await waitFor(() =>
      expect(mockedNavigate).toHaveBeenCalledWith(
        `/${mockOrg}/${mockOrg}-resources/resource/${mockResource1.identifier}/policy`,
      ),
    );
  });

  it('opens navigation modal when policy has errors when navigating from policy to about page', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource2));
    const getValidatePolicy = jest.fn().mockImplementation(() => Promise.reject(null));
    (useParams as jest.Mock).mockReturnValue({
      pageType: 'policy',
      resourceId: mockResource1.identifier,
      org: mockOrg,
    });

    renderResourcePage({ getResource, getValidatePolicy });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    const aboutButton = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_about'),
    });
    await user.click(aboutButton);

    expect(
      screen.getByText(textMock('resourceadm.resource_navigation_modal_title_policy')),
    ).toBeInTheDocument();
  });

  it('should call editResource when resource data is changed', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource1));

    (useParams as jest.Mock).mockReturnValue({
      pageType: 'deploy',
      resourceId: mockResource1.identifier,
      org: mockOrg,
    });

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );

    const deployButton = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_deploy'),
    });
    await waitFor(() => user.click(deployButton));

    const deployFieldLabel = textMock('resourceadm.deploy_version_label');
    await waitFor(() => screen.findByText(deployFieldLabel));
    const deployResourceVersionField = screen.getByLabelText(deployFieldLabel);
    await user.type(deployResourceVersionField, '1.2');
    await waitFor(() => deployResourceVersionField.blur());

    await waitFor(() => expect(queriesMock.updateResource).toHaveBeenCalledTimes(1));
  });

  it('fetches consent templates when resource is consent resource', async () => {
    const resource = { ...mockResource1, resourceType: 'Consent' as ResourceTypeOption };
    const getResource = jest.fn().mockImplementation(() => Promise.resolve<Resource>(resource));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.about_resource_spinner')),
    );
    expect(queriesMock.getConsentTemplates).toHaveBeenCalledTimes(1);
  });
});

const renderResourcePage = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <ResourcePage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
