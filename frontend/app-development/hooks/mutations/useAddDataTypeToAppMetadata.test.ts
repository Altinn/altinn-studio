import { renderHookWithMockStore } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { waitFor } from '@testing-library/react';
import { useAddDataTypeToAppMetadata } from './useAddDataTypeToAppMetadata';

const org = 'org';
const app = 'app';
const dataTypeId = 'paymentInformation-1234';

describe('useAddDataTypeToAppMetadata', () => {
  it('Calls addDataTypeToAppMetadata with correct arguments and payload', async () => {
    const addDataTypeToAppMetadata = renderHookWithMockStore()(() =>
      useAddDataTypeToAppMetadata(org, app),
    ).renderHookResult.result;
    await addDataTypeToAppMetadata.current.mutateAsync({
      dataTypeId,
    });
    await waitFor(() => expect(addDataTypeToAppMetadata.current.isSuccess).toBe(true));

    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledWith(org, app, dataTypeId);
  });
});
