import React from 'react';
import axios from 'axios';
import { XSDUpload } from './XSDUpload';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const user = userEvent.setup();

// Mocks:
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const clickUploadButton = async () => {
  const btn = screen.getByText(textMock('app_data_modelling.upload_xsd'));
  await act(() => user.click(btn));
};

const render = (queryClient: QueryClient = createQueryClientMock()) =>
  renderWithProviders({ queryClient })(<XSDUpload/>);

describe('XSDUpload', () => {
  afterEach(() => jest.restoreAllMocks());
  it('should show file picker button', () => {
    render();

    const button = screen.getByText(textMock('app_data_modelling.upload_xsd'));
    expect(button).toBeInTheDocument();

    const fileInput = screen.queryByTestId('FileSelector-input');
    expect(fileInput).toBeInTheDocument();
  });

  it('should show error text when file upload results in error', async () => {
    mockedAxios.post.mockImplementation(() => Promise.reject(new Error('mocked error')));
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    render();

    await clickUploadButton();

    expect(
      screen.queryByText(textMock('form_filler.file_uploader_validation_error_upload'))
    ).not.toBeInTheDocument();

    const fileInput = screen.getByTestId('FileSelector-input');

    await act(() => user.upload(fileInput, file));

    expect(
      screen.getByText(textMock('form_filler.file_uploader_validation_error_upload'))
    ).toBeInTheDocument();
  });

  it('Invalidates metadata query when upload is successful', async () => {
    mockedAxios.post.mockImplementation(() => Promise.resolve({ status: 200 }));
    const filename = 'hello';
    const file = new File([filename], `${filename}.xsd`, { type: 'text/xml' });
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    render(queryClient);

    await clickUploadButton();

    const fileInput = screen.getByTestId('FileSelector-input');

    await act(() => user.upload(fileInput, file));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
  });
});
