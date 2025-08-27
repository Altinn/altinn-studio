import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useUpsertTextResourceMutation } from './useUpsertTextResourceMutation';
import { renderHookWithProviders } from '../../testing/mocks';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { appContextMock } from '../../testing/appContextMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const language = 'nb';
const textId = 'testid';
const translation = 'testvalue';
const args: UpsertTextResourceMutation = { textId, language, translation };

describe('useUpsertTextResourceMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const renderUpsertTextResourcesMutationResult = renderHookWithProviders(() =>
      useUpsertTextResourceMutation(org, app),
    ).result;
    await renderUpsertTextResourcesMutationResult.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: translation,
    });
    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledWith(language);
  });
});
