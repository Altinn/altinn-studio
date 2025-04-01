import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import type { UpdateTextResourcesForOrgMutationArgs } from './useUpdateTextResourcesForOrgMutation';
import { useUpdateTextResourcesForOrgMutation } from './useUpdateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { label1TextResource, label2TextResource } from '../../mocks/textResourcesMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('useUpdateTextResourcesForOrgMutation', () => {
  it('Calls updateTextResourcesForOrg with correct arguments and payload', async () => {
    const orgName = 'org';
    const updateTextResourcesForOrg = jest.fn();
    const { result } = renderHookWithProviders(
      () => useUpdateTextResourcesForOrgMutation(orgName),
      { queries: { updateTextResourcesForOrg } },
    );
    const language: string = 'nb';
    const payload: KeyValuePairs<string> = {
      [label1TextResource.id]: label1TextResource.value,
      [label2TextResource.id]: label2TextResource.value,
    };
    const args: UpdateTextResourcesForOrgMutationArgs = { language, payload };

    result.current.mutate(args);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(updateTextResourcesForOrg).toHaveBeenCalledWith(orgName, language, payload);
  });
});
