import { screen, within } from '@testing-library/react';
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
  scope: 'altinn:authorization/authorize',
  description: 'description1',
};
const scopeMock2: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.write',
  description: 'description2',
};
const scopeMock3: MaskinportenScope = {
  scope: 'altinn:appdeploy',
  description: 'description3',
};
const scopeMock4: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.read',
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
    expect(
      getText(textMock('app_settings.maskinporten_scope_changes_deployment_notice')),
    ).toBeInTheDocument();
  });

  it('should display only selected scopes in the page table', () => {
    renderScopeList();

    const selectedScopesTable = getTable();

    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(
        within(selectedScopesTable).getByRole('cell', { name: scope.scope }),
      ).toBeInTheDocument();
      expect(
        within(selectedScopesTable).getByRole('cell', { name: scope.description }),
      ).toBeInTheDocument();
    });

    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(
        within(selectedScopesTable).queryByRole('cell', { name: scope.scope }),
      ).not.toBeInTheDocument();
    });
  });

  it('should display empty selected scopes message when no scopes are selected', () => {
    renderScopeList({ componentProps: { selectedScopes: [] } });

    expect(getText(textMock('app_settings.maskinporten_no_scopes_added'))).toBeInTheDocument();
  });

  it('should open add scopes dialog with selected scopes checked', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await openAddScopeDialog(user);

    const dialog = getDialog();
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('closedby', 'closerequest');

    selectedScopesMock.forEach((scope: MaskinportenScope) => {
      expect(within(dialog).getByRole('checkbox', { name: scope.scope })).toBeChecked();
    });
    maskinportenScopesMock.forEach((scope: MaskinportenScope) => {
      expect(within(dialog).getByRole('checkbox', { name: scope.scope })).not.toBeChecked();
    });
  });

  it('should disable unmarking selected mandatory scopes in the add scopes dialog', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await openAddScopeDialog(user);
    const dialog = getDialog();
    const selectedMandatoryScopeCheckbox = within(dialog).getByRole('checkbox', {
      name: scopeMock4.scope,
    });
    const availableMandatoryScopeCheckbox = within(dialog).getByRole('checkbox', {
      name: scopeMock2.scope,
    });

    expect(selectedMandatoryScopeCheckbox).toBeChecked();
    expect(selectedMandatoryScopeCheckbox).toBeDisabled();
    expect(availableMandatoryScopeCheckbox).not.toBeChecked();
    expect(availableMandatoryScopeCheckbox).not.toBeDisabled();

    await user.click(selectedMandatoryScopeCheckbox);

    expect(selectedMandatoryScopeCheckbox).toBeChecked();
  });

  it('should sort serviceowner scopes first in selected scopes and dialog scopes', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const selectedScopeCells = screen
      .getAllByRole('cell')
      .filter((cell: HTMLElement) => cell.textContent?.startsWith('altinn:'))
      .map((cell: HTMLElement) => cell.textContent);

    expect(selectedScopeCells).toEqual([scopeMock4.scope, scopeMock3.scope]);

    await openAddScopeDialog(user);
    const dialog = getDialog();
    const dialogScopeCheckboxes = within(dialog)
      .getAllByRole('checkbox')
      .map((checkbox: HTMLElement) => checkbox.getAttribute('aria-label'))
      .filter((label: string | null) => label?.startsWith('altinn:'));

    expect(dialogScopeCheckboxes).toEqual([
      scopeMock4.scope,
      scopeMock2.scope,
      scopeMock3.scope,
      scopeMock1.scope,
    ]);
  });

  it('should filter scopes in the add scopes dialog when searching', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await openAddScopeDialog(user);
    const dialog = getDialog();

    await user.type(
      within(dialog).getByRole('searchbox', {
        name: textMock('app_settings.maskinporten_scope_search_label'),
      }),
      scopeMock1.scope,
    );

    expect(within(dialog).getByRole('checkbox', { name: scopeMock1.scope })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('checkbox', { name: scopeMock2.scope }),
    ).not.toBeInTheDocument();
  });

  it('should call updateSelectedMaskinportenScopes with selected scopes when completing the dialog', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await openAddScopeDialog(user);
    const dialog = getDialog();
    await user.click(within(dialog).getByRole('checkbox', { name: scopeMock1.scope }));
    await user.click(
      within(dialog).getByRole('button', {
        name: textMock('app_settings.maskinporten_add_scope_dialog_done'),
      }),
    );

    const updatedScopes: MaskinportenScopes = {
      scopes: [scopeMock4, scopeMock3, scopeMock1],
    };

    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledWith(
      org,
      app,
      updatedScopes,
    );
  });

  it('should not update selected scopes when cancelling the dialog', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await openAddScopeDialog(user);
    const dialog = getDialog();
    await user.click(within(dialog).getByRole('checkbox', { name: scopeMock1.scope }));
    await user.click(within(dialog).getByRole('button', { name: textMock('general.cancel') }));

    expect(queriesMock.updateSelectedMaskinportenScopes).not.toHaveBeenCalled();
  });

  it('should call updateSelectedMaskinportenScopes without the removed scope when deleting a selected scope', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await user.click(getButton(textMock('general.delete_item', { item: scopeMock3.scope })));

    const updatedScopes: MaskinportenScopes = {
      scopes: [scopeMock4],
    };

    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateSelectedMaskinportenScopes).toHaveBeenCalledWith(
      org,
      app,
      updatedScopes,
    );
  });

  it('should not update selected scopes when deleting a mandatory selected scope', async () => {
    const user = userEvent.setup();
    renderScopeList();

    const deleteButton = getButton(textMock('general.delete_item', { item: scopeMock4.scope }));

    expect(deleteButton).toBeDisabled();

    await user.click(deleteButton);

    expect(queriesMock.updateSelectedMaskinportenScopes).not.toHaveBeenCalled();
  });

  it('should display a success toast when the update is successful', async () => {
    const user = userEvent.setup();
    renderScopeList();

    await user.click(getButton(textMock('general.delete_item', { item: scopeMock3.scope })));

    const successMessage = textMock('app_settings.maskinporten_tab_save_scopes_success_message');
    expect(await screen.findByText(successMessage)).toBeInTheDocument();
  });

  it('should display an error toast when the update fails', async () => {
    const user = userEvent.setup();
    const updateSelectedMaskinportenScopes = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: {} }));
    renderScopeList({ queries: { updateSelectedMaskinportenScopes } });

    await user.click(getButton(textMock('general.delete_item', { item: scopeMock3.scope })));

    const errorMessage = textMock('app_settings.maskinporten_tab_save_scopes_error_message');
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
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

const openAddScopeDialog = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(getButton(textMock('app_settings.maskinporten_add_scope')));
};

const getText = (name: string): HTMLElement => screen.getByText(name);
const getTable = (): HTMLTableElement => screen.getByRole('table');
const getDialog = (): HTMLDialogElement => screen.getByRole('dialog');
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
