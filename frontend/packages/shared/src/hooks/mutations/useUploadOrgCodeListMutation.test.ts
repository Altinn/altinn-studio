import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import type { CodeList } from '@studio/components';
import { useUploadOrgCodeListMutation } from './useUploadOrgCodeListMutation';

// Test data:
const payload: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

describe('useUploadOrgCodeListMutation', () => {
  it('Calls useUploadOrgCodeListMutation with correct parameters', async () => {
    const renderUpdateOrgCodeListMutationResult = renderHookWithProviders(() =>
      useUploadOrgCodeListMutation(org),
    ).result;
    await renderUpdateOrgCodeListMutationResult.current.mutateAsync({
      payload,
    });
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledWith(org, payload);
  });
});
