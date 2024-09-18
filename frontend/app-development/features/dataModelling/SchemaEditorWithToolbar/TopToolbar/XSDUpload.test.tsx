import React from 'react';
import { XSDUpload } from './XSDUpload';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { fileSelectorInputId } from '@studio/testing/testids';
import { renderWithProviders } from '../../../../test/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

const user = userEvent.setup();

jest.mock('../../../../hooks/mutations/useUploadDataModelMutation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../hooks/mutations/useUploadDataModelMutation'),
}));

const useUploadDataModelMutationSpy = jest.spyOn(
  require('../../../../hooks/mutations/useUploadDataModelMutation'),
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
  afterEach(jest.restoreAllMocks);

  it('shows a spinner when uploading', async () => {
    useUploadDataModelMutationSpy.mockReturnValue({ isPending: true });

    renderXsdUpload();

    expect(screen.getByText(textMock('app_data_modelling.uploading_xsd'))).toBeInTheDocument();
  });

  it('shows file picker button', () => {
    renderXsdUpload();

    const button = screen.getByRole('button', { name: uploadButtonTextMock });
    expect(button).toBeInTheDocument();

    const fileInput = screen.getByTestId(fileSelectorInputId);
    expect(fileInput).toBeInTheDocument();
  });

  it('uploads a file', async () => {
    const errorCode = 'ModelWithTheSameTypeNameExists';
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload({
      queries: {
        uploadDataModel: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400, errorCode))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = screen.getByTestId(fileSelectorInputId);

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(textMock(`api_errors.${errorCode}`));
  });

  it('shows a specific error message when api returns an errorCode', async () => {
    const errorCode = 'ModelWithTheSameTypeNameExists';
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload({
      queries: {
        uploadDataModel: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400, errorCode))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = screen.getByTestId(fileSelectorInputId);

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(textMock(`api_errors.${errorCode}`));
  });

  it('shows a custom generic error message', async () => {
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    renderXsdUpload({
      queries: {
        uploadDataModel: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = screen.getByTestId(fileSelectorInputId);

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('form_filler.file_uploader_validation_error_upload'),
    );
  });
});
