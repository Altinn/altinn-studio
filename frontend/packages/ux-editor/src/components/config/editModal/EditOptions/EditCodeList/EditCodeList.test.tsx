import React from 'react';
import { EditCodeList } from './EditCodeList';
import { render, screen, waitFor } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { optionListIdsMock } from '../../../../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { FormComponent } from '../../../../../types/FormComponent';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PreviewContext, type PreviewContextProps } from 'app-development/contexts/PreviewContext';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.Dropdown,
  textResourceBindings: {
    title: 'ServiceName',
  },
  itemType: 'COMPONENT',
  dataModelBindings: { simpleBinding: 'some-path' },
};

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};

const queryClientMock = createQueryClientMock();

describe('EditCodeList', () => {
  afterEach(() => {
    queryClientMock.clear();
  });

  it('should render the component', async () => {
    renderEditCodeList();
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_code_list_helper')),
    ).toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();
    renderEditCodeList({
      handleComponentChange: handleComponentChangeMock,
    });

    await waitFor(() => screen.findByRole('combobox'));

    await user.selectOptions(screen.getByRole('combobox'), 'test-1');
    await waitFor(() => expect(handleComponentChangeMock).toHaveBeenCalled());
  });

  it('should remove options property (if it exists) when optionsId property changes', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();
    renderEditCodeList({
      handleComponentChange: handleComponentChangeMock,
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
    renderEditCodeList({
      componentProps: {
        optionsId: 'test-2',
      },
    });

    expect(await screen.findByRole('combobox')).toHaveValue('test-2');
  });

  it('should render returned error message if option list endpoint returns an error', async () => {
    renderEditCodeList({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject(new Error('Error'))),
      },
    });

    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  it('should render standard error message if option list endpoint throws an error without specified error message', async () => {
    renderEditCodeList({
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

    renderEditCodeList();
    await userFindUploadButtonAndClick(user);
    await userFindFileAndUpload(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_success'),
    );
  });

  it('should render error toast if file already exists', async () => {
    const user = userEvent.setup();
    const file = new File([optionListIdsMock[0]], optionListIdsMock[0] + '.json', {
      type: 'text/json',
    });

    renderEditCodeList();
    await userFindUploadButtonAndClick(user);
    await userFindFileAndUpload(user, file);

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

    renderEditCodeList();
    await userFindUploadButtonAndClick(user);
    await userFindFileAndUpload(user, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.model_properties_code_list_filename_error'),
    );
  });
});

const userFindUploadButtonAndClick = async (user: UserEvent) => {
  const btn = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_upload'),
  });
  await user.click(btn);
};

const userFindFileAndUpload = async (user: UserEvent, file: File) => {
  const fileInput = screen.getByLabelText(textMock('ux_editor.modal_properties_code_list_upload'));

  await user.upload(fileInput, file);
};

const renderEditCodeList = ({
  handleComponentChange = jest.fn(),
  queries = {
    getOptionListIds: jest
      .fn()
      .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock)),
  },
  componentProps = {},
} = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <PreviewContext.Provider value={{ ...defaultPreviewContextProps }}>
        <EditCodeList
          component={{
            ...mockComponent,
            ...componentProps,
          }}
          handleComponentChange={handleComponentChange}
        />
      </PreviewContext.Provider>
    </ServicesContextProvider>,
  );
};
