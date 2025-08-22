import React from 'react';
import { screen } from '@testing-library/react';
import { ScopeList } from './ScopeList';
import type { ScopeListProps } from './ScopeList';
import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
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

describe('ScopeList', () => {
  afterEach(jest.clearAllMocks);

  it('should render description and help text', () => {
    renderScopeList();

    expect(
      getText(textMock('app_settings.maskinporten_tab_available_scopes_description')),
    ).toBeInTheDocument();
    expect(
      getText(textMock('app_settings.maskinporten_tab_available_scopes_description_help')),
    ).toBeInTheDocument();
  });

  it('should display a list of scopes if maskinporten scopes are available and selected is empty', async () => {
    renderScopeList({
      componentProps: {
        selectedScopes: [],
      },
    });

    expect(getCheckoxes()).toHaveLength(3); // The two scopes + "select all"

    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(getCell(scope.description));
      expect(getCheckbox(scope.scope)).not.toBeChecked();
    });
  });

  it('should display a list of scopes if selected maskinporten scopes are available and maskinporten is empty', async () => {
    renderScopeList({
      componentProps: {
        maskinPortenScopes: [],
      },
    });

    expect(getCheckoxes()).toHaveLength(3); // The two scopes + "select all"

    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(getCell(scope.description));
      expect(getCheckbox(scope.scope)).toBeChecked();
    });
  });

  it('should display a merged list of scopes if both selected scopes and available scopes are available', async () => {
    renderScopeList();

    expect(getCheckoxes()).toHaveLength(5); // The four scopes + "select all"

    const combinedScopes: MaskinportenScope[] = [...maskinportenScopesMock, ...selectedScopesMock];
    combinedScopes.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
    });
    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
      expect(getCheckbox(scope.scope)).not.toBeChecked();
    });
    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(getCheckbox(scope.scope)).toBeInTheDocument();
      expect(getCell(scope.description)).toBeInTheDocument();
      expect(getCheckbox(scope.scope)).toBeChecked();
    });
  });

  it('should toggle all scopes when "select all" checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));

    expect(selectAllCheckbox).not.toBeChecked();
    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).toBeChecked();
  });

  it('should toggle individual scope checkbox when clicked', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const scopeCheckbox = getCheckbox(scopeMock1.scope);
    expect(scopeCheckbox).not.toBeChecked();

    await user.click(scopeCheckbox);
    expect(scopeCheckbox).toBeChecked();
  });

  it('should call updateSelectedMaskinportenScopes with correct payload when clicking save button', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));
    await user.click(selectAllCheckbox);

    const saveButton = getButton(textMock('app_settings.maskinporten_tab_save_scopes'));
    await user.click(saveButton);

    const allSelectedScopes: MaskinportenScopes = {
      scopes: [...maskinportenScopesMock, ...selectedScopesMock],
    };

    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledWith(
      org,
      app,
      allSelectedScopes,
    );
  });

  it('should display a success toast when the update is successful', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));
    await user.click(selectAllCheckbox);

    const saveButton = getButton(textMock('app_settings.maskinporten_tab_save_scopes'));
    await user.click(saveButton);

    const successMessage = textMock('app_settings.maskinporten_tab_save_scopes_success_message');
    expect(getText(successMessage)).toBeInTheDocument();
  });

  it('should display an error toast when the update fails', async () => {
    const user = userEvent.setup();
    const updateSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: {} }));
    renderScopeList({ queries: { updateSelectedMaskinportenScopes } });

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));
    await user.click(selectAllCheckbox);

    const saveButton = getButton(textMock('app_settings.maskinporten_tab_save_scopes'));
    await user.click(saveButton);

    const successMessage = textMock('app_settings.maskinporten_tab_save_scopes_error_message');
    expect(getText(successMessage)).toBeInTheDocument();
  });

  it('should reset checkboxes to initial values when reset button is clicked', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const randomcheckbox = getCheckbox(scopeMock1.scope);
    expect(randomcheckbox).not.toBeChecked();
    await user.click(randomcheckbox);
    expect(randomcheckbox).toBeChecked();

    const resetButton = getButton(textMock('app_settings.maskinporten_tab_reset_scopes'));
    await user.click(resetButton);
    expect(randomcheckbox).not.toBeChecked();
  });

  it('should disable save button when checkboxes are not changed from initial values', async () => {
    const user = userEvent.setup();
    renderScopeList({ componentProps: { selectedScopes: [] } });

    const saveButton = getButton(textMock('app_settings.maskinporten_tab_save_scopes'));
    expect(saveButton).toBeDisabled();

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));
    await user.click(selectAllCheckbox);
    expect(saveButton).not.toBeDisabled();

    await user.click(selectAllCheckbox);
    expect(saveButton).toBeDisabled();
  });

  it('should disable reset button when checkboxes are not changed from initial values', async () => {
    const user = userEvent.setup();
    renderScopeList({ componentProps: { selectedScopes: [] } });

    const resetButton = getButton(textMock('app_settings.maskinporten_tab_reset_scopes'));
    expect(resetButton).toBeDisabled();

    const selectAllCheckbox = getCheckbox(textMock('app_settings.maskinporten_select_all_scopes'));
    await user.click(selectAllCheckbox);
    expect(resetButton).not.toBeDisabled();

    await user.click(selectAllCheckbox);
    expect(resetButton).toBeDisabled();
  });
});

const defaultProps: ScopeListProps = {
  maskinPortenScopes: maskinportenScopesMock,
  selectedScopes: selectedScopesMock,
};

type Props = {
  componentProps: Partial<ScopeListProps>;
  queries: Partial<ServicesContextProps>;
};

const renderScopeList = (props: Partial<Props> = {}) => {
  const { componentProps, queries } = props;
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(
    allQueries,
    queryClient,
  )(<ScopeList {...defaultProps} {...componentProps} />);
};

const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getCheckoxes = (): HTMLInputElement[] => screen.getAllByRole('checkbox');
const getCheckbox = (name: string): HTMLInputElement => screen.getByRole('checkbox', { name });
const getCell = (name: string): HTMLTableCellElement => screen.getByRole('cell', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
