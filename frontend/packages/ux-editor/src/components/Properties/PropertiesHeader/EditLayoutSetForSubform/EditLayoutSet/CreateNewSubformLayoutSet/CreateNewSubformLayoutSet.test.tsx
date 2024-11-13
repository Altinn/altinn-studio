import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import { layoutSets } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';

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

  it('displays the card with label, input field and data model select', () => {
    renderCreateNewSubformLayoutSet();
    const subformNameInput = screen.getByRole('textbox');
    const dataModelSelect = screen.getByRole('combobox');

    expect(subformNameInput).toBeInTheDocument();
    expect(dataModelSelect).toBeInTheDocument();
  });

  it('displays the save button and close button', () => {
    renderCreateNewSubformLayoutSet();
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });

    expect(saveButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
  });

  it('displays not the close button when hasSubforms is false', () => {
    renderCreateNewSubformLayoutSet({ hasSubforms: false });
    const closeButton = screen.queryByRole('button', { name: textMock('general.close') });
    expect(closeButton).not.toBeInTheDocument();
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

  it('disables the save button when input is invalid and data model is valid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const dataModelSelect = screen.getByRole('combobox');
    await user.selectOptions(dataModelSelect, ['moped']);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();

    const input = screen.getByRole('textbox');
    await user.type(input, 'æøå');
    expect(saveButton).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'NewSubform');

    expect(saveButton).not.toBeDisabled();
  });

  it('disables the save button when the input is valid and data model is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when both input and data model is valid', async () => {
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
  return renderWithProviders(
    <CreateNewSubformLayoutSet
      onUpdateLayoutSet={onUpdateLayoutSetMock}
      layoutSets={layoutSets}
      setShowCreateSubformCard={setShowCreateSubformCardMock}
      hasSubforms={hasSubforms}
    />,
  );
};
