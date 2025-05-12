import React from 'react';
import { SelectTab } from './SelectTab';
import { screen, waitFor } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders, optionListIdsMock } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { FormComponent } from '../../../../../../types/FormComponent';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
const optionsIdMock = optionListIdsMock[0];
mockComponent.optionsId = optionsIdMock;

const handleComponentChangeMock = jest.fn();
const getOptionListIds = jest
  .fn()
  .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock));

describe('SelectTab', () => {
  it('should render the component', async () => {
    renderSelectTab();
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_code_list_helper')),
    ).toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const user = userEvent.setup();
    renderSelectTab();

    await waitFor(() => screen.findByRole('combobox'));

    await user.selectOptions(screen.getByRole('combobox'), 'test-1');
    await waitFor(() => expect(handleComponentChangeMock).toHaveBeenCalled());
  });

  it('should remove options property (if it exists) when optionsId property changes', async () => {
    const user = userEvent.setup();
    renderSelectTab({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });

    await waitFor(() => screen.findByRole('combobox'));

    await user.selectOptions(screen.getByRole('combobox'), 'test-1');
    await waitFor(() =>
      expect(handleComponentChangeMock).toHaveBeenCalledWith({
        ...mockComponent,
        options: undefined,
        optionsId: 'test-1',
      }),
    );
  });

  it('should render the selected option list item upon component initialization', async () => {
    renderSelectTab({
      componentProps: {
        optionsId: 'test-2',
      },
    });

    expect(await screen.findByRole('combobox')).toHaveValue('test-2');
  });

  it('should render returned error message if option list endpoint returns an error', async () => {
    renderSelectTab({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject(new Error('Error'))),
      },
    });

    expect(
      await screen.findByText(
        textMock('ux_editor.modal_properties_fetch_option_list_error_message'),
      ),
    ).toBeInTheDocument();
  });

  it('should render standard error message if option list endpoint throws an error without specified error message', async () => {
    renderSelectTab({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()),
      },
    });

    expect(
      await screen.findByText(
        textMock('ux_editor.modal_properties_fetch_option_list_error_message'),
      ),
    ).toBeInTheDocument();
  });

  it('should render success toast if file upload is successful', async () => {
    const user = userEvent.setup();
    const file = new File(['hello'], 'hello.json', { type: 'text/json' });

    renderSelectTab();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_success'),
    );
  });

  it('should render error toast if file already exists', async () => {
    const user = userEvent.setup();
    const file = new File([optionListIdsMock[0]], `${optionListIdsMock[0]}.json`, {
      type: 'text/json',
    });

    renderSelectTab();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('validation_errors.upload_file_name_occupied'),
    );
  });

  it('should render generic upload error toast if upload fails for unknown reasons', async () => {
    const uploadOptionList = jest.fn().mockImplementation(() => Promise.reject({}));
    const user = userEvent.setup();
    const file = new File([], 'some-file.json', {
      type: 'text/json',
    });

    renderSelectTab({ queries: { uploadOptionList } });
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_generic_error'),
    );
  });

  it('should render alert on invalid file name', async () => {
    const user = userEvent.setup();
    const invalidFileName = 'æ.json';
    const file = new File([optionListIdsMock[0]], invalidFileName, {
      type: 'text/json',
    });

    renderSelectTab();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('validation_errors.file_name_invalid'),
    );
  });
});

const userFindUploadButtonAndClick = async (user: UserEvent) => {
  const btn = screen.getByRole('button', {
    name: textMock('ux_editor.options.upload_title'),
  });
  await user.click(btn);
};

const userFindFileInputAndUploadFile = async (user: UserEvent, file: File) => {
  const fileInput = screen.getByLabelText(textMock('ux_editor.options.upload_title'));
  await user.upload(fileInput, file);
};

const renderSelectTab = ({ queries = {}, componentProps = {} } = {}) => {
  return renderWithProviders(
    <SelectTab
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChangeMock}
    />,
    {
      queries: { getOptionListIds, ...queries },
      queryClient: createQueryClientMock(),
    },
  );
};
