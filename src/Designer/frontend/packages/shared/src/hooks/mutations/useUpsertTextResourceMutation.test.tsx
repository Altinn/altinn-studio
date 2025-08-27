import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useUpsertTextResourceMutation } from './useUpsertTextResourceMutation';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data:
const language = 'nb';
const textId = 'testid';
const translation = 'testvalue';
const args: UpsertTextResourceMutation = { textId, language, translation };

describe('useUpsertTextResourceMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const { result: renderUpsertTextResourcesMutationResult } = renderUpsertTextResourceMutation();
    await renderUpsertTextResourcesMutationResult.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: translation,
    });
  });
});

const renderUpsertTextResourceMutation = () => {
  return renderHookWithProviders(() => useUpsertTextResourceMutation(org, app));
};
