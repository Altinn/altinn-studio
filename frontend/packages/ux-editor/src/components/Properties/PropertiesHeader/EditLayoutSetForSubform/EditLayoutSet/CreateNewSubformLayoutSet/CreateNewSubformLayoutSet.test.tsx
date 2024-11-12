import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSets } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';
import { AppContext } from '../../../../../../AppContext';
import { appContextMock } from '../../../../../../testing/appContextMock';
import { layoutSetsMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const onUpdateLayoutSetMock = jest.fn();
const setShowCreateSubformCardMock = jest.fn();
const selectedOptionDataType = 'moped';

jest.mock('./SubformDataModelSelect', () => ({
  SubformDataModelSelect: ({
    selectedDataType,
    setSelectedDataType,
  }: {
    selectedDataType: string | undefined;
    setSelectedDataType: (value: string) => void;
  }) => (
    <select onChange={(e) => setSelectedDataType(e.target.value)} value={selectedDataType}>
      <option value={selectedOptionDataType}>Mock Data Type</option>
    </select>
  ),
}));

describe('CreateNewSubformLayoutSet ', () => {
  afterEach(jest.clearAllMocks);

  it('displays the card with label and input field', () => {
    renderCreateNewSubformLayoutSet();
    const card = screen.getByRole('textbox', {
      name: textMock('ux_editor.component_properties.subform.created_layout_set_name'),
    });

    expect(card).toBeInTheDocument();
  });

  it('displays the data model select', async () => {
    renderCreateNewSubformLayoutSet();
    const dataModelSelect = screen.getByRole('combobox');
    expect(dataModelSelect).toBeInTheDocument();
  });

  it('displays the save button', () => {
    renderCreateNewSubformLayoutSet();
    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(saveButton).toBeInTheDocument();
  });

  it('displays the cancel button', () => {
    renderCreateNewSubformLayoutSet();
    const cancelButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(cancelButton).toBeInTheDocument();
  });

  it('displays not the cancel button when hasSubforms is false', () => {
    renderCreateNewSubformLayoutSet({ hasSubforms: false });
    const cancelButton = screen.queryByRole('button', { name: textMock('general.close') });
    expect(cancelButton).not.toBeInTheDocument();
  });

  it('calls onSubformCreated when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();
    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');
    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, ['moped']);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(onUpdateLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(onUpdateLayoutSetMock).toHaveBeenCalledWith('NewSubform');
  });

  it('disables the save button when input is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();

    const input = screen.getByRole('textbox');

    await user.type(input, 'æøå');
    expect(saveButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'e re a');
    expect(saveButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'NewSubform');

    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, ['moped']);
    expect(saveButton).not.toBeDisabled();
  });

  it('disables the save button when the input is valid and no data model is selected', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();
  });

  it('does not disable the save button when the input is valid and a data model is selected', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');

    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, ['moped']);

    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(saveButton).not.toBeDisabled();
  });
});

const renderCreateNewSubformLayoutSet = ({
  hasSubforms = true,
}: { hasSubforms?: boolean } = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <CreateNewSubformLayoutSet
        onUpdateLayoutSet={onUpdateLayoutSetMock}
        layoutSets={layoutSets}
        setShowCreateSubformCard={setShowCreateSubformCardMock}
        hasSubforms={hasSubforms}
      />
    </AppContext.Provider>,
    { queryClient },
  );
};
