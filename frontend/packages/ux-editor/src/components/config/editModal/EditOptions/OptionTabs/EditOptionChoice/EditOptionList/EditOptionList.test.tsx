import React from 'react';
import { EditOptionList } from './EditOptionList';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { renderWithProviders, optionListIdsMock } from '../../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { FormComponent } from '../../../../../../../types/FormComponent';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
const optionsIdMock = optionListIdsMock[0];
mockComponent.optionsId = optionsIdMock;

const handleComponentChangeMock = jest.fn();
const getOptionListIds = jest
  .fn()
  .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock));

describe('EditOptionList', () => {
  it('should render the component', async () => {
    renderEditOptionList();
    expect(await screen.findByText(textMock('ux_editor.options.upload_title'))).toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const user = userEvent.setup();
    renderEditOptionList();
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    await userFindDropDownButton(user);
    const choice = screen.getByText(optionListIdsMock[0]);
    await user.click(choice);

    await waitFor(() => expect(handleComponentChangeMock).toHaveBeenCalledTimes(1));
  });

  it('should remove options property (if it exists) when optionsId property changes', async () => {
    const user = userEvent.setup();
    renderEditOptionList({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    await userFindDropDownButton(user);
    const choice = screen.getByText(optionListIdsMock[0]);
    await user.click(choice);

    await waitFor(() =>
      expect(handleComponentChangeMock).toHaveBeenCalledWith({
        ...mockComponent,
        options: undefined,
        optionsId: 'test-1',
      }),
    );
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
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );
    await userFindUploadButtonAndClick(user);
    await userFindFileInputAndUploadFile(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_filename_error'),
    );
  });
});

async function userFindUploadButtonAndClick(user: UserEvent) {
  const btn = screen.getByRole('button', {
    name: textMock('ux_editor.options.upload_title'),
  });
  await user.click(btn);
}

async function userFindFileInputAndUploadFile(user: UserEvent, file: File) {
  const fileInput = screen.getByLabelText(textMock('ux_editor.options.upload_title'));

  await user.upload(fileInput, file);
}

async function userFindDropDownButton(user: UserEvent) {
  const btn = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list'),
  });
  await user.click(btn);
}

function renderEditOptionList({ queries = {}, componentProps = {} } = {}) {
  return renderWithProviders(
    <EditOptionList
      setChosenOption={jest.fn()}
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
}
