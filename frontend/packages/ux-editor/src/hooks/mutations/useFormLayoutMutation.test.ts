import {
  baseContainerIdMock,
  queriesMock,
  renderHookWithMockStore
} from '../../testing/mocks';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { IInternalLayout } from '../../types/global';
import { ComponentType } from '../../components';

// Test data:
const org = 'org';
const app = 'app';
const layoutName = 'layoutName';

describe('useFormLayoutMutation', () => {
  it('Calls saveFormLayout with correct arguments and payload', async () => {
    const componentId = 'component1';
    const componentType = ComponentType.TextArea;
    const baseContaierId = baseContainerIdMock;
    const containerId = 'container1';
    const newLayout: IInternalLayout = {
      components: {
        [componentId]: {
          id: componentId,
          type: componentType,
          itemType: 'COMPONENT'
        }
      },
      containers: {
        [baseContaierId]: { itemType: 'CONTAINER' },
        [containerId]: { itemType: 'CONTAINER' }
      },
      order: {
        [baseContaierId]: [containerId],
        [containerId]: [componentId]
      },
    }
    await renderAndMutate(newLayout);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      expect.objectContaining({
        data: {
          layout: [
            {
              id: containerId,
              type: ComponentType.Group,
              children: [componentId]
            },
            {
              id: componentId,
              type: componentType,
            }
          ]
        }
      })
    );
  });
});

const renderAndMutate = (layout: IInternalLayout) => renderHookWithMockStore()
  (() => useFormLayoutMutation(org, app, layoutName))
    .renderHookResult
    .result
    .current
    .mutateAsync(layout);
