import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ResourcePage } from './ResourcePage';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
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
  resourceReferences: [{ reference: 'ref', referenceType: 'Default', referenceSource: 'Altinn2' }],
};

const mockResource2: Resource = {
  identifier: 'r2',
  title: { nb: '', nn: '', en: '' },
};

const mockSelectedContext: string = 'test';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    pageType: 'about',
    resourceId: mockResource1.identifier,
    selectedContext: mockSelectedContext,
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

  it('fetches validate resource on mount', () => {
    renderResourcePage();
    expect(queriesMock.getValidateResource).toHaveBeenCalledTimes(1);
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

    expect(screen.getByTitle(textMock('resourceadm.about_resource_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('resourceadm.about_resource_title'),
        level: 1,
      }),
    ).not.toBeInTheDocument();
  });

  it('displays migrate tab in left navigation bar when resource reference is present in resource', async () => {
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource1));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.getByRole('tab', { name: textMock('resourceadm.left_nav_bar_migration') }),
    ).toBeInTheDocument();
  });

  it('does not display migrate tab in left navigation bar when resource reference is not in resource', async () => {
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource2));

    renderResourcePage({ getResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.queryByRole('tab', { name: textMock('resourceadm.left_nav_bar_migrate') }),
    ).not.toBeInTheDocument();
  });

  it('opens navigation modal when resource has errors', async () => {
    const user = userEvent.setup();
    const getResource = jest
      .fn()
      .mockImplementation(() => Promise.resolve<Resource>(mockResource2));
    const getValidateResource = jest.fn().mockImplementation(() => Promise.reject(null));

    renderResourcePage({ getResource, getValidateResource });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.about_resource_spinner')),
    );

    expect(
      screen.queryByRole('heading', {
        name: textMock('resourceadm.resource_navigation_modal_title_resource'),
        level: 1,
      }),
    ).not.toBeInTheDocument();

    const policyButton = screen.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_policy'),
    });
    await act(() => user.click(policyButton));

    expect(
      screen.getByRole('heading', {
        name: textMock('resourceadm.resource_navigation_modal_title_resource'),
        level: 1,
      }),
    ).toBeInTheDocument();
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
