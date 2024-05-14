import React from 'react';
import { XSDUpload } from './XSDUpload';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import * as testids from '../../../../../testing/testids';
import { renderWithMockStore } from '../../../../test/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

const user = userEvent.setup();

jest.mock('../../../../hooks/mutations/useUploadDatamodelMutation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../hooks/mutations/useUploadDatamodelMutation'),
}));

const useUploadDatamodelMutationSpy = jest.spyOn(
  require('../../../../hooks/mutations/useUploadDatamodelMutation'),
  'useUploadDatamodelMutation',
);

const clickUploadButton = async () => {
  const btn = screen.getByText(textMock('app_data_modelling.upload_xsd'));
  await user.click(btn);
};

const render = ({
  queries = {},
  queryClient = createQueryClientMock(),
}: {
  queryClient?: QueryClient;
  queries?: Partial<ServicesContextProps>;
} = {}) => renderWithMockStore({}, queries, queryClient)(<XSDUpload />);

describe('XSDUpload', () => {
  afterEach(jest.restoreAllMocks);

  it('shows a spinner when uploading', async () => {
    useUploadDatamodelMutationSpy.mockReturnValue({ isPending: true });

    render();

    expect(screen.getByText(textMock('app_data_modelling.uploading_xsd'))).toBeInTheDocument();
  });

  it('shows file picker button', () => {
    render();

    const button = screen.getByRole('button', { name: textMock('app_data_modelling.upload_xsd') });
    expect(button).toBeInTheDocument();

    const fileInput = screen.getByTestId(testids.fileSelectorInput);
    expect(fileInput).toBeInTheDocument();
  });

  it('uploads a file', async () => {
    const errorCode = 'ModelWithTheSameTypeNameExists';
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    render({
      queries: {
        uploadDatamodel: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400, errorCode))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = screen.getByTestId(testids.fileSelectorInput);

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(textMock(`api_errors.${errorCode}`));
  });

  it('shows error text when file upload results in error', async () => {
    const errorCode = 'ModelWithTheSameTypeNameExists';
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    render({
      queries: {
        uploadDatamodel: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400, errorCode))),
      },
      queryClient: null,
    });

    await clickUploadButton();

    const fileInput = screen.getByTestId(testids.fileSelectorInput);

    await user.upload(fileInput, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(textMock(`api_errors.${errorCode}`));
  });
});
