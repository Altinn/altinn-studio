import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import type { CodeList } from '@studio/components';
import { useUpdateOrgCodeListMutation } from './useUpdateOrgCodeListMutation';

// Test data:
const codeListId = 'testId';
const payload: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

describe('useUpdateOrgCodeListMutation', () => {
  it('Calls useUpdateOrgCodeListMutation with correct parameters', async () => {
    const renderUpdateOrgCodeListMutationResult = renderHookWithProviders(() =>
      useUpdateOrgCodeListMutation(org),
    ).result;
    await renderUpdateOrgCodeListMutationResult.current.mutateAsync({
      codeListId,
      payload,
    });
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledWith(org, codeListId, payload);
  });
});
