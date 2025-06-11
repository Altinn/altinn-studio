import React from 'react';
import { screen } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { componentMocks } from '../../../../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ObjectUtils } from '@studio/pure-functions';
import type { ITextResources } from 'app-shared/types/global';
import userEvent from '@testing-library/user-event';
import { ManualOptionsEditor, type ManualOptionsEditorProps } from './ManualOptionsEditor';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const onDeleteButtonClick = jest.fn();
const handleComponentChange = jest.fn();
const textResources: ITextResources = {
  nb: [
    { id: 'some-id', value: 'label 1' },
    { id: 'another-id', value: 'label 2' },
    { id: 'description-id', value: 'description' },
  ],
};

describe('ManualOptionEditor', () => {
  afterEach(jest.clearAllMocks);

  it('should render the open Dialog button', () => {
    renderManualOptionsEditor();
    expect(getEditButton()).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.options.modal_header_manual_code_list')),
    ).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call handleComponentChange with correct parameters when closing Dialog and options is empty', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor({
      props: { component: { ...mockComponent, options: [], optionsId: undefined } },
    });
    const expectedArgs = ObjectUtils.deepCopy(mockComponent);
    expectedArgs.options = undefined;
    expectedArgs.optionsId = undefined;

    await user.click(getEditButton());
    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
  });

  it('should call upsertTextResource with correct parameters when editing description', async () => {
    const user = userEvent.setup();
    const expectedLanguage = 'nb';
    const expectedTextResource = { 'some-id': 'test' };
    renderManualOptionsEditor({
      props: {
        component: {
          ...mockComponent,
          options: [{ value: 'value', label: 'label', description: 'some-id' }],
        },
      },
    });
    const text = 'test';

    await user.click(getEditButton());
    const textBox = getTextResourceDescriptionInput(1);
    await user.type(textBox, text);
    await user.tab();

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(
      org,
      app,
      expectedLanguage,
      expectedTextResource,
    );
  });

  it('should show placeholder for option label when label is empty', () => {
    renderManualOptionsEditor({
      props: {
        component: {
          ...mockComponent,
          options: [{ value: 1, label: '' }],
        },
      },
    });

    expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
  });

  it('should call onDeleteButtonClick when removing chosen options', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();

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

function getDeleteButton() {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
}

const defaultProps: ManualOptionsEditorProps = {
  onDeleteButtonClick,
  handleComponentChange: handleComponentChange,
  component: mockComponent,
  textResources,
};

function renderManualOptionsEditor({
  queries = {},
  props = {},
  queryClient = createQueryClientMock(),
} = {}) {
  renderWithProviders(<ManualOptionsEditor {...defaultProps} {...props} />, {
    queries,
    queryClient,
  });
}
