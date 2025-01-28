import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useCreateOrgCodeListMutation } from './useCreateOrgCodeListMutation';
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
