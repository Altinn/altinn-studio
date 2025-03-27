import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import type { UpdateTextResourcesForOrgMutationArgs } from './useUpdateTextResourcesForOrgMutation';
import { useUpdateTextResourcesForOrgMutation } from './useUpdateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { type ITextResource } from '../../types/global';
import { label1TextResource, label2TextResource } from '../../mocks/textResourcesMock';

describe('useUpdateTextResourcesForOrgMutation', () => {
  it('Calls updateTextResourcesForOrg with correct arguments and payload', async () => {
    const orgName = 'org';
    const { result } = renderHookWithProviders(() => useUpdateTextResourcesForOrgMutation(orgName));
    const language: string = 'nb';
    const payload: ITextResource[] = [label1TextResource, label2TextResource];
    const args: UpdateTextResourcesForOrgMutationArgs = { language, payload };

    result.current.mutate(args);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledWith(orgName, language, payload);
  });
});
