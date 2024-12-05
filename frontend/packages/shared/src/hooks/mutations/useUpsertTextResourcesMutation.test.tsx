import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { UpsertTextResourcesMutationArgs } from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type { ITextResource } from 'app-shared/types/global';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data:
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const textResources: ITextResource[] = [{ id: textId, value: textValue }];
const args: UpsertTextResourcesMutationArgs = { language, textResources };

describe('useUpsertTextResourcesMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const result = renderHookWithProviders(() => useUpsertTextResourcesMutation(org, app)).result;
    await result.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});
