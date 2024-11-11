import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';
import type { Option } from 'app-shared/types/Option';
import { OptionListEditor } from './OptionListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const mockComponentOptionsId = 'options';

const apiResult: OptionsLists = {
  options: [
    { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
    { value: 2, label: 'label number', description: null, helpText: null },
    { value: true, label: 'label boolean', description: null, helpText: null },
  ],
};

describe('OptionListEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render a spinner when there is no data', () => {
    renderOptionListEditor({
      queries: {
        getOptionLists: jest.fn().mockImplementation(() => Promise.resolve<OptionsLists>({})),
      },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    ).toBeInTheDocument();
  });

  it('should render an error message when api throws an error', async () => {
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
      queries: {
        getOptionLists: jest.fn().mockRejectedValueOnce(new Error('Error')),
      },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_error_message')),
    ).toBeInTheDocument();
  });

  it('should render the open Dialog button', async () => {
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

    const btnOpen = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_open_editor'),
    });

    expect(btnOpen).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

    await openModal(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

    await openModal(user);
    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call doReloadPreview when editing', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
      previewContextProps: { doReloadPreview },
    });

    await openModal(user);
    const textBox = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_code_list_item_description', { number: 2 }),
    });
    await user.type(textBox, 'test');

    await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
  });

  it('should call updateOptionList with correct parameters when closing Dialog', async () => {
    const user = userEvent.setup();
    await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
    const expectedResultAfterEdit: Option[] = [
      { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
      { value: 2, label: 'label number', description: 'test', helpText: null },
      { value: true, label: 'label boolean', description: null, helpText: null },
    ];

    await openModal(user);
    const textBox = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_code_list_item_description', { number: 2 }),
    });
    await user.type(textBox, 'test');

    await waitFor(() => expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1));
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(
      org,
      app,
      mockComponentOptionsId,
      expectedResultAfterEdit,
    );
  });
});

const openModal = async (user: UserEvent) => {
  const btnOpen = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_open_editor'),
  });
  await user.click(btnOpen);
};

const renderOptionListEditor = ({ previewContextProps = {}, queries = {} } = {}) => {
  return renderWithProviders(<OptionListEditor optionsId={mockComponentOptionsId} />, {
    queries: {
      getOptionLists: jest.fn().mockImplementation(() => Promise.resolve<OptionsLists>(apiResult)),
      ...queries,
    },
    queryClient: createQueryClientMock(),
    previewContextProps,
  });
};

const renderOptionListEditorAndWaitForSpinnerToBeRemoved = async ({
  previewContextProps = {},
  queries = {
    getOptionLists: jest.fn().mockImplementation(() => Promise.resolve<OptionsLists>(apiResult)),
  },
} = {}) => {
  const view = renderOptionListEditor({ previewContextProps, queries });
  await waitForElementToBeRemoved(() => {
    return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
  });
  return view;
};
