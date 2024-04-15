import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useUpsertTextResourceMutation } from './useUpsertTextResourceMutation';
import { renderHookWithProviders } from '../../testing/mocks';
import type { UpsertTextResourceMutation } from 'packages/text-editor/src/types';
import { appContextMock } from '../../testing/appContextMock';

// Test data:
const org = 'org';
const app = 'app';
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
    expect(appContextMock.refetchTexts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchTexts).toHaveBeenCalledWith(language);
  });
});
