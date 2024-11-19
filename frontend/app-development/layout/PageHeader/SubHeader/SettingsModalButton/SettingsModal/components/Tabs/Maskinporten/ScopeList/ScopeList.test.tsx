import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ScopeList } from './ScopeList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

const scopeMock1: MaskinportenScope = {
  scope: 'scope1',
  description: 'description1',
};

const scopeMock2: MaskinportenScope = {
  scope: 'scope2',
  description: 'description2',
};

const allScopes: MaskinportenScope[] = [scopeMock1, scopeMock2];

describe('ScopeList', () => {
  it('should display a spinner while loading', () => {
    renderScopeList();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should display a list of scopes if scopes are available', async () => {
    const mockGetMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(allScopes));

    renderScopeList({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    allScopes.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).not.toBeChecked();
    });
  });

  it('should display a list of scopes available and the correct scopes selected', async () => {
    const mockGetMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve(allScopes));
    const mockGetSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve([scopeMock1]));

    renderScopeList({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
        getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(screen.getByRole('checkbox', { name: scopeMock1.scope })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: scopeMock2.scope })).not.toBeChecked();
  });

  it('should display an alert if no scopes are available', async () => {
    const mockGetMaskinportenScopes = jest.fn().mockImplementation(() => Promise.resolve([]));

    renderScopeList({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
      },
    });
    await waitForGetScopesCheckIsDone();

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_no_scopes_available')),
    ).toBeInTheDocument();
  });
});

type RenderScopeListProps = {
  queries?: Partial<typeof queriesMock>;
};
const renderScopeList = ({ queries = queriesMock }: Partial<RenderScopeListProps> = {}) => {
  const queryClient = createQueryClientMock();

  renderWithProviders({ ...queriesMock, ...queries }, queryClient)(<ScopeList />);
};

async function waitForGetScopesCheckIsDone() {
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
}
