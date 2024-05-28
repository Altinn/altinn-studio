import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { waitFor } from '@testing-library/react';
import type { AddWidgetMutationArgs } from './useAddWidgetMutation';
import { useAddWidgetMutation } from './useAddWidgetMutation';
import type { IWidget, IWidgetTexts } from '../../types/global';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const displayName = ComponentTypeV3.TextArea;
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
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
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
