import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import type { AddWidgetMutationArgs } from './useAddWidgetMutation';
import { useAddWidgetMutation } from './useAddWidgetMutation';
import type { IWidget, IWidgetTexts } from '../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';
const displayName = ComponentType.TextArea;
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const resources: ITextResource[] = [{ id: textId, value: textValue }];
const texts: IWidgetTexts[] = [{ language, resources }];
const widget: IWidget = {
  components: [],
  texts,
  displayName,
};
const defaultArgs: AddWidgetMutationArgs = { widget, position: 0 };

describe('useAddWidgetMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Saves layout', async () => {
    const { result } = await renderAddWidgetMutation();
    await result.current.mutateAsync(defaultArgs);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });

  it('Saves text resources', async () => {
    const { result } = await renderAddWidgetMutation();
    await result.current.mutateAsync(defaultArgs);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(texts.length);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});

const renderAddWidgetMutation = async () => {
  const { result: formLayouts } = renderHookWithMockStore()(() =>
    useFormLayoutsQuery(org, app, selectedLayoutSet),
  ).renderHookResult;
  await waitFor(() => expect(formLayouts.current.isSuccess).toBe(true));
  const { result: texts } = renderHookWithMockStore()(() =>
    useTextResourcesQuery(org, app),
  ).renderHookResult;
  await waitFor(() => expect(texts.current.isSuccess).toBe(true));
  return renderHookWithMockStore()(() => useAddWidgetMutation(org, app, selectedLayoutSet))
    .renderHookResult;
};
