import React from 'react';
import { screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ObjectUtils } from '@studio/pure-functions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../../../testing/componentMocks';
import { ManualOptionsEditor, type ManualOptionsEditorProps } from './ManualOptionsEditor';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const handleDelete = jest.fn();
const handleComponentChange = jest.fn();

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

  it('should call handleComponentChange with correct parameters when editing', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();
    const text = 'test';
    const expectedArgs = ObjectUtils.deepCopy(mockComponent);
    expectedArgs.optionsId = undefined;
    expectedArgs.options[0].description = text;

    await user.click(getEditButton());
    const textBox = getDescriptionInput(1);
    await user.type(textBox, text);
    await user.tab();

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
  });

  it('should show placeholder for option label when option list label is empty', () => {
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

  it('should call handleDelete when removing chosen options', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();

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

const defaultProps: ManualOptionsEditorProps = {
  handleDelete: handleDelete,
  handleComponentChange: handleComponentChange,
  component: mockComponent,
};

function renderManualOptionsEditor({ queries = {}, props = {} } = {}) {
  renderWithProviders(<ManualOptionsEditor {...defaultProps} {...props} />, {
    queries,
    queryClient: createQueryClientMock(),
  });
}
