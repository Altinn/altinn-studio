import { renderHookWithProviders } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { waitFor } from '@testing-library/react';
import { useAddDataTypeToAppMetadata } from './useAddDataTypeToAppMetadata';
import { app, org } from '@studio/testing/testids';

const dataTypeId = 'paymentInformation-1234';
const taskId = 'task_1';

describe('useAddDataTypeToAppMetadata', () => {
  it('Calls addDataTypeToAppMetadata with correct arguments and payload', async () => {
    const addDataTypeToAppMetadata = renderHookWithProviders()(() =>
      useAddDataTypeToAppMetadata(org, app),
    ).renderHookResult.result;
    await addDataTypeToAppMetadata.current.mutateAsync({
      dataTypeId,
      taskId,
    });
    await waitFor(() => expect(addDataTypeToAppMetadata.current.isSuccess).toBe(true));

    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledWith(
      org,
      app,
      dataTypeId,
      taskId,
      undefined,
    );
  });
});
