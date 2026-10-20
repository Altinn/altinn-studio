import { afterEach, describe, expect, it, vi } from 'vitest';
import { XSDUpload } from './XSDUpload';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '../../../../../test/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import * as useUploadDataModelMutationModule from '../../../../../hooks/mutations/useUploadDataModelMutation';

const user = userEvent.setup();

vi.mock('../../../../../hooks/mutations/useUploadDataModelMutation', async () => ({
  __esModule: true,
  ...(await vi.importActual('../../../../../hooks/mutations/useUploadDataModelMutation')),
}));

const useUploadDataModelMutationSpy = vi.spyOn(
  useUploadDataModelMutationModule,
  'useUploadDataModelMutation',
);

const uploadButtonTextMock = 'Upload XSD';
const clickUploadButton = async () => {
  const btn = screen.getByRole('button', { name: uploadButtonTextMock });
  await user.click(btn);
};

const renderXsdUpload = ({
  queries = {},
  queryClient = createQueryClientMock(),
}: {
  queryClient?: QueryClient;
  queries?: Partial<ServicesContextProps>;
} = {}) =>
  renderWithProviders(queries, queryClient)(<XSDUpload uploadButtonText={uploadButtonTextMock} />);

describe('XSDUpload', () => {
  afterEach(vi.restoreAllMocks);

  it('shows a spinner when uploading', async () => {
    useUploadDataModelMutationSpy.mockReturnValue({ isPending: true } as unknown as ReturnType<
      typeof useUploadDataModelMutationModule.useUploadDataModelMutation
    >);

    renderXsdUpload();

    expect(screen.getByText(textMock('app_data_modeling.uploading_xsd'))).toBeInTheDocument();
  });

  it('shows file picker button', () => {
    renderXsdUpload();

    const button = screen.getByRole('button', { name: uploadButtonTextMock });
    expect(button).toBeInTheDocument();

    const fileInput = getFileInputElement();
    expect(fileInput).toBeInTheDocument();
  });

  it('uploads a valid file', async () => {
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload();
    await clickUploadButton();
    const fileInput = getFileInputElement();
    await user.upload(fileInput, file);

    const formDataMock = new FormData();
    formDataMock.append('file', file);
    expect(queriesMock.uploadDataModel).toHaveBeenCalledWith(org, app, formDataMock);
  });

  it('shows a specific error message when api returns an errorCode', async () => {
    const errorCode = 'ModelWithTheSameTypeNameExists';
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload({
      queries: {
        uploadDataModel: vi
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400, errorCode))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = getFileInputElement();

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(textMock(`api_errors.${errorCode}`));
  });

  it('does not allow uploading with duplicate datatypes', async () => {
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
      dataTypes: [{ id: 'hello' }],
    });
    renderXsdUpload({
      queryClient: queryClient,
    });

    await clickUploadButton();

    const fileInput = getFileInputElement();

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('schema_editor.error_data_type_name_exists'),
    );
  });

  it('shows confirm dialog when uploading a model with colliding id with another model', async () => {
    window.confirm = vi.fn();
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
      dataTypes: [{ id: 'hello', appLogic: { classRef: 'someClassRef' } }],
    });
    renderXsdUpload({
      queryClient: queryClient,
    });
    await clickUploadButton();
    const fileInput = getFileInputElement();
    await user.upload(fileInput, file);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('overrides data model if confirm dialog is accepted', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
      dataTypes: [{ id: 'hello', appLogic: { classRef: 'someClassRef' } }],
    });
    renderXsdUpload({
      queryClient: queryClient,
    });
    await clickUploadButton();
    const fileInput = getFileInputElement();
    await user.upload(fileInput, file);

    const formDataMock = new FormData();
    formDataMock.append('file', file);
    expect(queriesMock.uploadDataModel).toHaveBeenCalledWith(org, app, formDataMock);
  });

  it('does not allow uploading with invalid name', async () => {
    window.alert = vi.fn();
    const file = new File(['$-_123'], '$-_123.xsd', { type: 'text/xml' });
    renderXsdUpload();

    await clickUploadButton();

    const fileInput = getFileInputElement();

    await user.upload(fileInput, file);

    expect(window.alert).toHaveBeenCalledWith(
      textMock('app_data_modeling.upload_xsd_invalid_name_error'),
    );
    expect(window.alert).toHaveBeenCalledTimes(1);
  });

  it('shows a custom generic error message', async () => {
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload({
      queries: {
        uploadDataModel: vi.fn().mockImplementation(() => Promise.reject(createApiErrorMock(400))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = getFileInputElement();

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('form_filler.file_uploader_validation_error_upload'),
    );
  });
});

function getFileInputElement(): HTMLInputElement {
  return screen.getByLabelText(uploadButtonTextMock);
}
