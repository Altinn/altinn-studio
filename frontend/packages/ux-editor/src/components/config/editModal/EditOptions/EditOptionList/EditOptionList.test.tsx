import React from 'react';
import { EditOptionList } from './EditOptionList';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { optionListIdsMock, renderWithProviders } from '../../../../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { FormComponent } from '../../../../../types/FormComponent';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { addFeatureFlagToLocalStorage } from 'app-shared/utils/featureToggleUtils';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
const optionsIdMock = optionListIdsMock[0];
mockComponent.optionsId = optionsIdMock;

const handleComponentChangeMock = jest.fn();
const getOptionListIds = {
  getOptionListIds: jest
    .fn()
    .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock)),
};

describe('EditOptionList', () => {
  it('should render the component', async () => {
    renderEditOptionList();
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_code_list_helper')),
    ).toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const user = userEvent.setup();
    renderEditOptionList();

    await waitFor(() => screen.findByRole('combobox'));

    await user.selectOptions(screen.getByRole('combobox'), 'test-1');
    await waitFor(() => expect(handleComponentChangeMock).toHaveBeenCalled());
  });

  it('should remove options property (if it exists) when optionsId property changes', async () => {
    const user = userEvent.setup();
    renderEditOptionList({
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
    renderEditOptionList({
      componentProps: {
        optionsId: 'test-2',
      },
    });

    expect(await screen.findByRole('combobox')).toHaveValue('test-2');
  });

  it('should render returned error message if option list endpoint returns an error', async () => {
    renderEditOptionList({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject(new Error('Error'))),
      },
    });

    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  it('should render standard error message if option list endpoint throws an error without specified error message', async () => {
    renderEditOptionList({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()),
      },
    });

    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_error_message')),
    ).toBeInTheDocument();
  });

  it('should render success toast if file upload is successful', async () => {
    const user = userEvent.setup();
    const file = new File(['hello'], 'hello.json', { type: 'text/json' });

    renderEditOptionList();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_success'),
    );
  });

  it('should render error toast if file already exists', async () => {
    const user = userEvent.setup();
    const file = new File([optionListIdsMock[0]], optionListIdsMock[0] + '.json', {
      type: 'text/json',
    });

    renderEditOptionList();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_duplicate_error'),
    );
  });

  it('should render alert on invalid file name', async () => {
    const user = userEvent.setup();
    const invalidFileName = '_InvalidFileName.json';
    const file = new File([optionListIdsMock[0]], invalidFileName, {
      type: 'text/json',
    });

    renderEditOptionList();
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_filename_error'),
    );
  });

  it('should render OptionListEditor when featureFlag is active', async () => {
    addFeatureFlagToLocalStorage('optionListEditor');
    const queries = {
      getOptionLists: jest.fn().mockImplementation(() =>
        Promise.resolve<OptionsLists>({
          optionsIdMock: [{ value: 'test', label: 'label text' }],
        }),
      ),
    };
    renderEditOptionList({ queries: queries });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    );
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_code_list_open_editor'),
      }),
    ).toBeInTheDocument();
  });
});

const userFindUploadButtonAndClick = async (user: UserEvent) => {
  const btn = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_upload'),
  });
  await user.click(btn);
};

const userFindFileInputAndUploadFile = async (user: UserEvent, file: File) => {
  const fileInput = screen.getByLabelText(textMock('ux_editor.modal_properties_code_list_upload'));

  await user.upload(fileInput, file);
};

const renderEditOptionList = ({ queries = {}, componentProps = {} } = {}) => {
  return renderWithProviders(
    <EditOptionList
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChangeMock}
    />,
    {
      queries: { ...getOptionListIds, ...queries },
      queryClient: createQueryClientMock(),
    },
  );
};