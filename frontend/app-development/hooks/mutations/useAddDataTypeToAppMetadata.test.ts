import { renderHookWithMockStore } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { waitFor } from '@testing-library/react';
import { useAddDataTypeToAppMetadata } from './useAddDataTypeToAppMetadata';
import { app, org } from '@studio/testing/testids';

const dataTypeId = 'paymentInformation-1234';
const mockedPolicy = {
  rules: ['mocked:policy:rule'],
};

describe('useAddDataTypeToAppMetadata', () => {
  it('Calls addDataTypeToAppMetadata with correct arguments and payload', async () => {
    const addDataTypeToAppMetadata = renderHookWithMockStore()(() =>
      useAddDataTypeToAppMetadata(org, app),
    ).renderHookResult.result;
    await addDataTypeToAppMetadata.current.mutateAsync({
      dataTypeId,
      policy: mockedPolicy,
    });
    await waitFor(() => expect(addDataTypeToAppMetadata.current.isSuccess).toBe(true));

    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.addDataTypeToAppMetadata).toHaveBeenCalledWith(
      org,
      app,
      dataTypeId,
      mockedPolicy,
    );
  });
});
