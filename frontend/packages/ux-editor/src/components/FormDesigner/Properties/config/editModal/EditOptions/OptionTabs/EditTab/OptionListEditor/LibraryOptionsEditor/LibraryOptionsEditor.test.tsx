import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ObjectUtils } from '@studio/pure-functions';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import type { ITextResources } from 'app-shared/types/global';
import type { QueryClient } from '@tanstack/react-query';
import type { OptionList } from 'app-shared/types/OptionList';
import type { Option } from 'app-shared/types/Option';
import { LibraryOptionsEditor, type LibraryOptionsEditorProps } from './LibraryOptionsEditor';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const optionListId = 'someId';
const componentWithOptionsId = { ...mockComponent, options: undefined, optionsId: optionListId };
const onDeleteButtonClick = jest.fn();
const doReloadPreview = jest.fn();
const optionList: OptionList = [
  { value: 'value 1', label: 'some-id', description: 'description-id', helpText: 'help text' },
  { value: 'value 2', label: 'another-id', description: null, helpText: null },
  { value: 'value 3', label: '', description: null, helpText: null },
];
const textResources: ITextResources = {
  nb: [
    { id: 'some-id', value: 'label 1' },
    { id: 'another-id', value: 'label 2' },
    { id: 'description-id', value: 'description' },
  ],
};

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
    const textBox = getValueInput(1);
    await user.type(textBox, 'test');
    await user.tab();

    await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
  });

  it('should call updateOptionList with correct parameters when editing value', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();
    const expectedResultAfterEdit: Option[] = ObjectUtils.deepCopy(optionList);
    expectedResultAfterEdit[0].value = 'test';

    await user.click(getEditButton());
    const textBox = getValueInput(1);
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

  it('should call upsertTextResources with correct parameters when editing description', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();
    const expectedLanguage = 'nb';
    const expectedTextResource = { 'description-id': 'test' };

    await user.click(getEditButton());
    const textBox = getTextResourceDescriptionInput(1);
    await user.type(textBox, 'test');
    await user.tab();

    await waitFor(() => expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1));
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(
      org,
      app,
      expectedLanguage,
      expectedTextResource,
    );
  });

  it('should show placeholder for option label when option list label is empty', async () => {
    renderLibraryOptionsEditorWithData();

    expect(
      screen.getByText(textMock('general.empty_string'), { exact: false }),
    ).toBeInTheDocument();
  });

  it('should call onDeleteButtonClick when removing chosen options', async () => {
    const user = userEvent.setup();
    renderLibraryOptionsEditorWithData();

    await user.click(getDeleteButton());

    expect(onDeleteButtonClick).toHaveBeenCalledTimes(1);
  });
});

function getEditButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getTextResourceDescriptionInput(number: number) {
  return screen.getByRole('textbox', {
    name: textMock('code_list_editor.text_resource.description.value', { number }),
  });
}

function getValueInput(number: number) {
  return screen.getByRole('textbox', {
    name: textMock('code_list_editor.value_item', { number }),
  });
}

function getDeleteButton() {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
}

const defaultProps: LibraryOptionsEditorProps = {
  onDeleteButtonClick,
  optionListId: optionListId,
  textResources,
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
