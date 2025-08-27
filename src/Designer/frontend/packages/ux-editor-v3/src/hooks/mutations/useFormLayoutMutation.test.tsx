import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import type { IInternalLayout } from '../../types/global';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { baseContainerIdMock, layout1NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import type { AppContextProps } from '../../AppContext';
import type { RefObject } from 'react';
import { createRef } from 'react';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;
const componentId = 'component1';
const componentType = ComponentTypeV3.TextArea;
const baseContainerId = baseContainerIdMock;
const containerId = 'container1';
const newLayout: IInternalLayout = {
  components: {
    [componentId]: {
      id: componentId,
      type: componentType,
      itemType: 'COMPONENT',
      dataModelBindings: {},
      pageIndex: null,
    },
  },
  containers: {
    [baseContainerId]: {
      id: baseContainerId,
      itemType: 'CONTAINER',
      pageIndex: null,
      type: undefined,
    },
    [containerId]: {
      id: containerId,
      itemType: 'CONTAINER',
      pageIndex: null,
      type: ComponentTypeV3.Group,
    },
  },
  order: {
    [baseContainerId]: [containerId],
    [containerId]: [componentId],
  },
  customDataProperties: {},
  customRootProperties: {},
};

describe('useFormLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayoutV3 with correct arguments and payload', async () => {
    await renderAndMutate(newLayout);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      expect.objectContaining({
        layout: expect.objectContaining({
          data: {
            layout: [
              {
                id: containerId,
                type: ComponentTypeV3.Group,
                children: [componentId],
              },
              {
                id: componentId,
                type: componentType,
                dataModelBindings: {},
              },
            ],
          },
        }),
      }),
    );
  });

  it('Reloads preview iframe', async () => {
    const reload = jest.fn();
    const previewIframeRefMock = createRef<HTMLIFrameElement>();
    const previewIframeRef: RefObject<HTMLIFrameElement> = {
      current: {
        ...previewIframeRefMock.current,
        contentWindow: {
          ...previewIframeRefMock.current?.contentWindow,
          location: {
            ...previewIframeRefMock.current?.contentWindow?.location,
            reload,
          },
        },
      },
    };
    await renderAndMutate(newLayout, { previewIframeRef });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

const renderAndMutate = (layout: IInternalLayout, appContext: Partial<AppContextProps> = {}) =>
  renderHookWithMockStore(
    {},
    {},
    queryClientMock,
    appContext,
  )(() =>
    useFormLayoutMutation(org, app, layoutName, selectedLayoutSet),
  ).renderHookResult.result.current.mutateAsync(layout);
