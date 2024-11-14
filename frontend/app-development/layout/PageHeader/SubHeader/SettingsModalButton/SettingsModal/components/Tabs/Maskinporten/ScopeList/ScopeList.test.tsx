import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ScopeList } from './ScopeList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

const scopesMock: MaskinportenScope = {
  label: 'label',
  description: 'description',
};

describe('ScopeList', () => {
  it('should display a spinner while loading', () => {
    renderScopeList();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should display a list of scopes if scopes are available', async () => {
    const mockGetMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.resolve([scopesMock]));

    renderScopeList({
      queries: {
        getMaskinportenScopes: mockGetMaskinportenScopes,
      },
    });

    await waitForGetScopesCheckIsDone();

    expect(
      screen.getByText('List of scopes and possibility to select scope comes here'),
    ).toBeInTheDocument();
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
