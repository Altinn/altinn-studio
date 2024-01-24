import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../../../ux-editor/src/testing/mocks';
import { waitFor } from '@testing-library/react';
import { useTextResourcesQuery } from '../../../../../app-development/hooks/queries';
import type { UpsertTextResourcesMutationArgs } from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type { ITextResource } from 'app-shared/types/global';

// Test data:
const org = 'org';
const app = 'app';
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const textResources: ITextResource[] = [{ id: textId, value: textValue }];
const args: UpsertTextResourcesMutationArgs = { language, textResources };

describe('useUpsertTextResourcesMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const { result: upsertTextResources } = await renderUpsertTextResourcesMutation();
    await upsertTextResources.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});

const renderUpsertTextResourcesMutation = async () => {
  const { result: texts } = renderHookWithMockStore()(() =>
    useTextResourcesQuery(org, app),
  ).renderHookResult;
  await waitFor(() => expect(texts.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useUpsertTextResourcesMutation(org, app)).renderHookResult;
};
