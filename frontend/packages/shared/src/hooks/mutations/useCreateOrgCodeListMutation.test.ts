import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useCreateOrgCodeListMutation } from 'app-shared/hooks/mutations/useCreateOrgCodeListMutation';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CodeList } from '@studio/components';

// Test data:
const codeListId = 'testId';
const payload: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

describe('useCreateOrgCodeListMutation', () => {
  it('Calls useCreateOrgCodeListMutation with correct parameters', async () => {
    const renderCreateOrgCodeListMutationResult = renderHookWithProviders(() =>
      useCreateOrgCodeListMutation(org),
    ).result;
    await renderCreateOrgCodeListMutationResult.current.mutateAsync({
      codeListId,
      payload,
    });
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledWith(org, codeListId, payload);
  });
});
