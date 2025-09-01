import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import type { IInternalLayout } from '../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { baseContainerIdMock, layout1NameMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;
const componentId = 'component1';
const componentType = ComponentType.TextArea;
const baseContainerId = baseContainerIdMock;
const containerId = 'container1';
const newLayout: IInternalLayout = {
  components: {
    [componentId]: {
      id: componentId,
      type: componentType,
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: { field: 'somePath', dataType: '' } },
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
      type: ComponentType.Group,
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

  it('Calls saveFormLayout with correct arguments and payload', async () => {
    await renderAndMutate(newLayout);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      selectedLayoutSet,
      {
        componentIdsChange: undefined,
        layout: expect.objectContaining({
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
                dataModelBindings: { simpleBinding: { field: 'somePath', dataType: '' } },
              },
            ],
          },
        }),
      },
    );
  });
});

const renderAndMutate = (layout: IInternalLayout) =>
  renderHookWithProviders(() => useFormLayoutMutation(org, app, layoutName, selectedLayoutSet), {
    queryClient: queryClientMock,
  }).result.current.mutateAsync({ internalLayout: layout });
