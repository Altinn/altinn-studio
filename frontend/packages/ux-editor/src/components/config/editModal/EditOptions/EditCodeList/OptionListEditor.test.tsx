import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { Option } from 'app-shared/types/Option';
import type { FormComponent } from '../../../../../types/FormComponent';
import { OptionListEditor } from './OptionListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
mockComponent.optionsId = 'options';

const apiResult = {
  options: [
    { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
    { value: 2, label: 'label number', description: null, helpText: null },
    { value: true, label: 'label boolean', description: null, helpText: null },
  ],
};

const queryClientMock = createQueryClientMock();

describe('OptionListEditor', () => {
  afterEach(() => {
    queryClientMock.clear();
  });

  it('should render a spinner when there is no data', () => {
    renderOptionListEditor({
      queries: {
        getOptionLists: jest
          .fn()
          .mockImplementation(() => Promise.resolve<Record<string, Option[]>>({})),
      },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    ).toBeInTheDocument();
  });

  it('should render a error message when api throws an error', async () => {
    renderOptionListEditor({
      queries: {
        getOptionLists: jest.fn().mockRejectedValueOnce(new Error('Error')),
      },
    });
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_error_message')),
    ).toBeInTheDocument();
  });

  it('should render the open Dialog button', async () => {
    renderOptionListEditor();
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    const btnOpen = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_open_editor'),
    });

    expect(btnOpen).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    renderOptionListEditor();
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    await openModal(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    renderOptionListEditor();
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    await openModal(user);

    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call handleClose when closing Dialog', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    renderOptionListEditor({
      previewContextProps: { doReloadPreview },
    });
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    await openModal(user);

    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doReloadPreview).toHaveBeenCalledTimes(1);
  });

  it('should call onChange when changing value in a textField', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    renderOptionListEditor({
      previewContextProps: { doReloadPreview },
    });
    await waitForElementToBeRemoved(() => {
      return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
    });

    await openModal(user);

    const textBox = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_code_list_item_description', { number: 2 }),
    });
    expect(textBox).toHaveTextContent('');
    await user.type(textBox, 'test');

    expect(
      screen.getByRole('textbox', {
        name: textMock('ux_editor.modal_properties_code_list_item_description', { number: 2 }),
      }),
    ).toHaveValue('test');
  });
});

const openModal = async (user: UserEvent) => {
  const btnOpen = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_open_editor'),
  });
  await user.click(btnOpen);
};

const renderOptionListEditor = ({
  previewContextProps = {},
  queries = {
    getOptionLists: jest
      .fn()
      .mockImplementation(() => Promise.resolve<Record<string, Option[]>>(apiResult)),
  },
} = {}) => {
  return renderWithProviders(
    <OptionListEditor
      component={{
        ...mockComponent,
      }}
    />,
    {
      queries: queries,
      queryClient: queryClientMock,
      previewContextProps: previewContextProps,
    },
  );
};
