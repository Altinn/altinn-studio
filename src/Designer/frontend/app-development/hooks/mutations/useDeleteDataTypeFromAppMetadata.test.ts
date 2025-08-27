import { renderHookWithProviders } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useDeleteDataTypeFromAppMetadata } from './useDeleteDataTypeFromAppMetadata';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

const dataTypeId = 'paymentInformation-1234';

describe('useDeleteDataTypeFromAppMetadata', () => {
  it('Calls deleteDataTypeFromAppMetadata with correct arguments and payload', async () => {
    const deleteDataTypeFromAppMetadata = renderHookWithProviders()(() =>
      useDeleteDataTypeFromAppMetadata(org, app),
    ).renderHookResult.result;
    await deleteDataTypeFromAppMetadata.current.mutateAsync({
      dataTypeId,
    });
    await waitFor(() => expect(deleteDataTypeFromAppMetadata.current.isSuccess).toBe(true));

    expect(queriesMock.deleteDataTypeFromAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteDataTypeFromAppMetadata).toHaveBeenCalledWith(org, app, dataTypeId);
  });
});
