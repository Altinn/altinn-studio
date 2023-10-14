import { queriesMock, queryClientMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { IInternalLayout } from '../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { baseContainerIdMock } from '../../testing/layoutMock';
import { AppContextProps } from '../../AppContext';
import { createRef, RefObject } from 'react';

// Test data:
const org = 'org';
const app = 'app';
const layoutName = 'layoutName';
const selectedLayoutSet = 'test-layout-set';
const componentId = 'component1';
const componentType = ComponentType.TextArea;
const baseContaierId = baseContainerIdMock;
const containerId = 'container1';
const newLayout: IInternalLayout = {
  components: {
    [componentId]: {
      id: componentId,
      type: componentType,
      itemType: 'COMPONENT',
      dataModelBindings: {},
    },
  },
  containers: {
    [baseContaierId]: { itemType: 'CONTAINER' },
    [containerId]: { itemType: 'CONTAINER' },
  },
  order: {
    [baseContaierId]: [containerId],
    [containerId]: [componentId],
  },
  customDataProperties: {},
  customRootProperties: {},
};

describe('useFormLayoutMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveFormLayout with correct arguments and payload', async () => {
    await renderAndMutate(newLayout);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      expect.objectContaining({
        data: {
          layout: [
            {
              id: containerId,
              type: ComponentType.Group,
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

const renderAndMutate = (
  layout: IInternalLayout,
  appContext: Partial<AppContextProps> = {},
) =>
  renderHookWithMockStore(
    {},
    {},
    queryClientMock,
    appContext,
  )(() =>
    useFormLayoutMutation(org, app, layoutName, selectedLayoutSet),
  ).renderHookResult.result.current.mutateAsync(layout);
