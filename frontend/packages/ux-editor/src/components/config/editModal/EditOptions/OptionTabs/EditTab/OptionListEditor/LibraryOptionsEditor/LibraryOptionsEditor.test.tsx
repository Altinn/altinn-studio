import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../../../../../../../testing/componentMocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ObjectUtils } from '@studio/pure-functions';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import type { OptionList } from 'app-shared/types/OptionList';
import type { Option } from 'app-shared/types/Option';
import type { QueryClient } from '@tanstack/react-query';
import { LibraryOptionsEditor, type LibraryOptionsEditorProps } from './LibraryOptionsEditor';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const optionListId = 'someId';
const componentWithOptionsId = { ...mockComponent, options: undefined, optionsId: optionListId };
const handleDelete = jest.fn();
const doReloadPreview = jest.fn();
const optionList: OptionList = [
  { value: 'value 1', label: 'label 1', description: 'description', helpText: 'help text' },
  { value: 'value 2', label: 'label 2', description: null, helpText: null },
  { value: 'value 3', label: '', description: null, helpText: null },
];

describe('LibraryOptionEditor', () => {
  afterEach(jest.clearAllMocks);

  it('should render the open Dialog button', async () => {
    renderLibraryOptionsEditorWithData();
    expect(getEditButton()).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.options.modal_header_library_code_list')),
    ).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();
    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call doReloadPreview when editing', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();

    await user.click(getEditButton());
    const textBox = getDescriptionInput(2);
    await user.type(textBox, 'test');
    await user.tab();

    await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
  });

  it('should call updateOptionList with correct parameters when closing Dialog', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();
    const expectedResultAfterEdit: Option[] = ObjectUtils.deepCopy(optionList);
    expectedResultAfterEdit[1].description = 'test';

    await user.click(getEditButton());
    const textBox = getDescriptionInput(2);
    await user.type(textBox, 'test');
    await user.tab();

    await waitFor(() => expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1));
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(
      org,
      app,
      componentWithOptionsId.optionsId,
      expectedResultAfterEdit,
    );
  });

  it('should show placeholder for option label when option list label is empty', async () => {
    renderLibraryOptionsEditorWithData();

    expect(
      screen.getByText(textMock('general.empty_string'), { exact: false }),
    ).toBeInTheDocument();
  });

  it('should call handleDelete when removing chosen options', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();

    await user.click(getDeleteButton());

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});

function getEditButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getDescriptionInput(number: number) {
  return screen.getByRole('textbox', {
    name: textMock('code_list_editor.description_item', { number }),
  });
}

function getDeleteButton() {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
}

const defaultProps: LibraryOptionsEditorProps = {
  handleDelete: handleDelete,
  optionListId: optionListId,
};

function renderLibraryOptionsEditor({
  queries = {},
  props = {},
  queryClient = createQueryClientMock(),
} = {}) {
  renderWithProviders(<LibraryOptionsEditor {...defaultProps} {...props} />, {
    queries,
    queryClient,
    previewContextProps: { doReloadPreview },
  });
}

function renderLibraryOptionsEditorWithData({ queries = {}, props = {} } = {}) {
  const queryClient = createQueryClientWithData();
  renderLibraryOptionsEditor({ queries, props, queryClient });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], optionList);
  return queryClient;
}
