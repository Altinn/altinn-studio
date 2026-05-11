import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useDeleteFormComponentMutation } from './useDeleteFormComponentMutation';
import { component2IdMock, externalLayoutsMock, layout1NameMock } from '../../testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../testing/componentMocks';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import { getDataTypesToSignMock } from 'app-shared/mocks/bpmnDefinitionsMock';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

jest.mock('bpmn-moddle', () =>
  jest.fn(() => ({
    fromXML: jest.fn().mockResolvedValue({
      rootElement: getDataTypesToSignMock([
        componentMocks[ComponentType.FileUpload].id,
        componentMocks[ComponentType.FileUploadWithTag].id,
      ]),
    }),
    toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
  })),
);

describe('useDeleteFormComponentMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Should save layout without deleted component', async () => {
    const { result } = await renderDeleteFormComponentsMutation();
    await result.current.mutateAsync(component2IdMock);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: [
          {
            newComponentId: undefined,
            oldComponentId: component2IdMock,
          },
        ],
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ id: component2IdMock })]),
          }),
        }),
      },
    );
  });

  describe('Testing deletion of FileUpload and FileUploadWithTag', () => {
    const componentTypes = [ComponentType.FileUpload, ComponentType.FileUploadWithTag];

    componentTypes.forEach((componentType) => {
      it(`Should remove ${componentType} data type from signing tasks`, async () => {
        const { result } = await renderDeleteFormComponentsMutation();
        const componentIdToDelete = componentMocks[componentType].id;
        await result.current.mutateAsync(componentIdToDelete);
        expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
        expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
          org,
          app,
          layout1NameMock,
          selectedLayoutSet,
          {
            componentIdsChange: [
              {
                newComponentId: undefined,
                oldComponentId: componentIdToDelete,
              },
            ],
            layout: expect.objectContaining({
              data: expect.objectContaining({
                layout: expect.not.arrayContaining([
                  expect.objectContaining({ id: componentIdToDelete }),
                ]),
              }),
            }),
          },
        );

        expect(queriesMock.deleteAppAttachmentMetadata).toHaveBeenCalledTimes(1);
        expect(queriesMock.updateBpmnXml).toHaveBeenCalledTimes(1);
      });
    });
  });
});

const renderDeleteFormComponentsMutation = async () => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));

  return renderHookWithProviders(
    () => useDeleteFormComponentMutation(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  );
};
