import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ScopeListContainer } from './ScopeListContainer';
import { textMock } from '@studio/testing/mocks/i18nMock';
import '@testing-library/jest-dom';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import {
  type MaskinportenScopes,
  type MaskinportenScope,
} from 'app-shared/types/MaskinportenScope';

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
  it('should display a spinner while loading', () => {
    renderScopeListContainer();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should display a list of scopes if maskinporten scopes are available', async () => {
    const mockGetMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(maskinportenScopes));
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve([]));

    renderScopeListContainer({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).not.toBeChecked();
    });
  });

  it('should display a list of scopes if selected maskinporten scopes are available', async () => {
    const mockGetMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(maskinportenScopes));

    renderScopeListContainer({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).toBeChecked();
    });
  });

  it('should display a merged list of scopes if both selected scopes and available scopes are available', async () => {
    const availableScopes: MaskinportenScopes = { scopes: [scopeMock1] };
    const mockGetMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(availableScopes));

    const selectedScopes: MaskinportenScopes = { scopes: [scopeMock2] };
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(selectedScopes));

    renderScopeListContainer({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    maskinportenScopes.scopes.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
    });
    expect(screen.getByRole('checkbox', { name: scopeMock1.scope })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: scopeMock2.scope })).toBeChecked();
  });

  it('should display an alert if no scopes are available', async () => {
    const mockGetMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve([]));

    renderScopeListContainer({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });
    await waitForGetScopesCheckIsDone();

    expect(
      screen.getByText(textMock('app_settings.maskinporten_no_scopes_available_description')),
    ).toBeInTheDocument();
  });
});

type RenderScopeListContainerProps = {
  queries?: Partial<typeof queriesMock>;
};

const renderScopeListContainer = ({
  queries = queriesMock,
}: Partial<RenderScopeListContainerProps> = {}) => {
  const queryClient = createQueryClientMock();
  renderWithProviders({ ...queriesMock, ...queries }, queryClient)(<ScopeListContainer />);
};

async function waitForGetScopesCheckIsDone() {
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
}
