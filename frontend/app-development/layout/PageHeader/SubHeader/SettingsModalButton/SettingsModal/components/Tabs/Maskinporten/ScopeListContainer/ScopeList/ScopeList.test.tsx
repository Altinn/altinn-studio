import React from 'react';
import { screen } from '@testing-library/react';
import { ScopeList, type ScopeListProps } from './ScopeList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import {
  type MaskinportenScopes,
  type MaskinportenScope,
} from 'app-shared/types/MaskinportenScope';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';

const scopeMock1: MaskinportenScope = {
  scope: 'scope1',
  description: 'description1',
};
const scopeMock2: MaskinportenScope = {
  scope: 'scope2',
  description: 'description2',
};
const scopeMock3: MaskinportenScope = {
  scope: 'scope3',
  description: 'description3',
};
const scopeMock4: MaskinportenScope = {
  scope: 'scope4',
  description: 'description4',
};

const maskinportenScopesMock: MaskinportenScope[] = [scopeMock1, scopeMock2];
const selectedScopesMock: MaskinportenScope[] = [scopeMock3, scopeMock4];

const defaultProps: ScopeListProps = {
  maskinPortenScopes: maskinportenScopesMock,
  selectedScopes: selectedScopesMock,
};

describe('ScopeListContainer', () => {
  it('should render description and help text', () => {
    renderScopeList();

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_available_scopes_description')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('settings_modal.maskinporten_tab_available_scopes_description_help'),
      ),
    ).toBeInTheDocument();
  });

  it('should display a list of scopes if maskinporten scopes are available and selected is empty', async () => {
    renderScopeList({
      props: {
        selectedScopes: [],
      },
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).not.toBeChecked();
    });
  });

  it('should display a list of scopes if selected maskinporten scopes are available and maskinporten is empty', async () => {
    renderScopeList({
      props: {
        maskinPortenScopes: [],
      },
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // The two scopes + "select all"

    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).toBeChecked();
    });
  });

  it('should display a merged list of scopes if both selected scopes and available scopes are available', async () => {
    renderScopeList();

    expect(screen.getAllByRole('checkbox')).toHaveLength(5); // The four scopes + "select all"

    const combinedScopes: MaskinportenScope[] = [...maskinportenScopesMock, ...selectedScopesMock];
    combinedScopes.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
    });
    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).not.toBeChecked();
    });
    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(screen.getByRole('checkbox', { name: scope.scope }));
      expect(screen.getByText(scope.description));
      expect(screen.getByRole('checkbox', { name: scope.scope })).toBeChecked();
    });
  });

  it('should toggle all scopes when "select all" checkbox is clicked', async () => {
    const uploadScopesListMock = jest.fn().mockImplementation(() => Promise.resolve());

    const user = userEvent.setup();
    renderScopeList({
      queries: {
        updateSelectedMaskinportenScopes: uploadScopesListMock,
      },
    });

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.maskinporten_select_all_scopes'),
    });

    expect(selectAllCheckbox).not.toBeChecked();
    await user.click(selectAllCheckbox);

    const allScopes: MaskinportenScopes = {
      scopes: [...maskinportenScopesMock, ...selectedScopesMock],
    };

    expect(uploadScopesListMock).toHaveBeenCalledTimes(1);
    expect(uploadScopesListMock).toHaveBeenCalledWith(org, app, allScopes);
  });

  it('should toggle individual scope checkbox when clicked', async () => {
    const uploadScopesListMock = jest.fn().mockImplementation(() => Promise.resolve());

    const user = userEvent.setup();
    renderScopeList({
      queries: {
        updateSelectedMaskinportenScopes: uploadScopesListMock,
      },
    });

    const scopeCheckbox = screen.getByRole('checkbox', { name: scopeMock1.scope });
    expect(scopeCheckbox).not.toBeChecked();

    await user.click(scopeCheckbox);

    const allSelectedScopes: MaskinportenScopes = {
      scopes: [scopeMock1, ...selectedScopesMock],
    };

    expect(uploadScopesListMock).toHaveBeenCalledTimes(1);
    expect(uploadScopesListMock).toHaveBeenCalledWith(org, app, allSelectedScopes);
  });
});

type RenderScopeListProps = {
  props?: Partial<ScopeListProps>;
  queries?: Partial<typeof queriesMock>;
};

const renderScopeList = ({ props, queries = queriesMock }: Partial<RenderScopeListProps> = {}) => {
  const queryClient = createQueryClientMock();

  renderWithProviders(
    { ...queriesMock, ...queries },
    queryClient,
  )(<ScopeList {...defaultProps} {...props} />);
};
