import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { usePublishCodeListMutation } from '../../hooks/mutations/usePublishCodeListMutation';
import type { PublishCodeListPayload } from '../../types/api/PublishCodeListPayload';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PUBLISHED_CODE_LIST_FOLDER } from 'app-shared/constants';

// Test data:
const org = 'test-org';
const payload: PublishCodeListPayload = {
  title: 'Test Code List',
  codeList: {
    codes: [
      { value: '001', label: { nb: 'En' } },
      { value: '002', label: { nb: 'To' } },
    ],
  },
};

describe('usePublishCodeListMutation', () => {
  it('Calls publishCodeList with correct arguments and payload', async () => {
    const publishCodeList = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeListMutation(org), {
      queries: { publishCodeList },
    });

    await result.current.mutateAsync(payload);

    expect(publishCodeList).toHaveBeenCalledTimes(1);
    expect(publishCodeList).toHaveBeenCalledWith(org, payload);
  });

  it('Calls the onStart callback with the code list name when mutation starts', async () => {
    const publishCodeList = jest.fn();
    const onStart = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeListMutation(org, { onStart }), {
      queries: { publishCodeList },
    });
    expect(onStart).not.toHaveBeenCalled();

    result.current.mutate(payload);
    await waitFor(expect(publishCodeList).toHaveBeenCalled);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(payload.title);
  });

  it('Calls the onFinish callback with the code list name when data has refetched', async () => {
    const publishCodeList = jest.fn();
    const onFinish = jest.fn();
    const queryClient = createQueryClientMock();
    const refetchSpy = jest.spyOn(queryClient, 'refetchQueries');
    const { result } = renderHookWithProviders(
      () => usePublishCodeListMutation(org, { onFinish }),
      { queries: { publishCodeList }, queryClient },
    );
    expect(onFinish).not.toHaveBeenCalled();

    result.current.mutate(payload);
    const queryKey = [QueryKey.PublishedResources, org, PUBLISHED_CODE_LIST_FOLDER];
    await waitFor(() => expect(refetchSpy).toHaveBeenCalledWith({ queryKey }));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(payload.title);
  });
});
