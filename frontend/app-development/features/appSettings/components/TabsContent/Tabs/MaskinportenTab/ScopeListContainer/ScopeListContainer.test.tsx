import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ScopeListContainer } from './ScopeListContainer';
import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const scopeMock1: MaskinportenScope = {
  scope: 'scope1',
  description: 'description1',
};

const scopeMock2: MaskinportenScope = {
  scope: 'scope2',
  description: 'description2',
};

const maskinportenScopes: MaskinportenScopes = { scopes: [scopeMock1, scopeMock2] };

describe('ScopeListContainer', () => {
  afterEach(jest.clearAllMocks);

  it('should display a spinner while loading', () => {
    renderScopeListContainer();
    expect(getText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should display a list of scopes if maskinporten scopes are available', async () => {
    const getMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(maskinportenScopes));
    const getSelectedMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderScopeListContainer({
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });

    await waitForGetScopesCheckIsDone();

    expect(getCheckoxes()).toHaveLength(3); // The two scopes + "select all"
    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
      expect(getCheckbox(scope.scope)).not.toBeChecked();
    });
  });

  it('should display a list of scopes if selected maskinporten scopes are available', async () => {
    const getMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const getSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(maskinportenScopes));

    renderScopeListContainer({
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });

    await waitForGetScopesCheckIsDone();

    expect(getCheckoxes()).toHaveLength(3); // The two scopes + "select all"
    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
      expect(getCheckbox(scope.scope)).toBeChecked();
    });
  });

  it('should display a merged list of scopes if both selected scopes and available scopes are available', async () => {
    const availableScopes: MaskinportenScopes = { scopes: [scopeMock1] };
    const getMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(availableScopes));

    const selectedScopes: MaskinportenScopes = { scopes: [scopeMock2] };
    const getSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(selectedScopes));

    renderScopeListContainer({
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });

    await waitForGetScopesCheckIsDone();

    expect(getCheckoxes()).toHaveLength(3); // The two scopes + "select all"
    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
    });
    expect(getCheckbox(scopeMock1.scope)).not.toBeChecked();
    expect(getCheckbox(scopeMock2.scope)).toBeChecked();
  });

  it('should display an alert if no scopes are available', async () => {
    const getMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const getSelectedMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderScopeListContainer({
      getMaskinportenScopes,
      getSelectedMaskinportenScopes,
    });
    await waitForGetScopesCheckIsDone();

    expect(
      getText(textMock('app_settings.maskinporten_no_scopes_available_description')),
    ).toBeInTheDocument();
  });
});

const renderScopeListContainer = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<ScopeListContainer />);
};

async function waitForGetScopesCheckIsDone() {
  await waitForElementToBeRemoved(() => getText(textMock('general.loading')));
}

const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getCheckoxes = (): HTMLInputElement[] => screen.getAllByRole('checkbox');
const getCheckbox = (name: string): HTMLInputElement => screen.getByRole('checkbox', { name });
const getCell = (name: string): HTMLTableCellElement => screen.getByRole('cell', { name });
