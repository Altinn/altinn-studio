import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useAddImageMutation } from './useAddImageMutation';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

describe('useAddImageMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls addImage with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useAddImageMutation(org, app)).renderHookResult
      .result;

    const file = new File(['file'], 'imageFileName', { type: 'image/png' });
    result.current.mutate(file);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.addImage).toHaveBeenCalledTimes(1);
    expect(queriesMock.addImage).toHaveBeenCalledWith(org, app, file);
  });

  it('Shows toast error when file size upload triggers 413 error', async () => {
    const addImageMock = jest.fn().mockImplementation(() => {
      return Promise.reject(createApiErrorMock(ServerCodes.TooLargeContent));
    });

    const result = renderHookWithProviders({ addImage: addImageMock })(() =>
      useAddImageMutation(org, app),
    ).renderHookResult.result;

    const file = new File(['file'], 'imageFileName', { type: 'image/png' });
    result.current.mutate(file);
    await waitFor(() => expect(result.current.isError).toBe(true));

    const toastError = screen.getByText(textMock('ux_editor.upload_file_error_too_large'));

    expect(toastError).toBeInTheDocument();
    expect(queriesMock.addImage).not.toHaveBeenCalled();
  });
});
