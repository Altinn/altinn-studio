import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useDeleteFormComponentMutation } from './useDeleteFormComponentMutation';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import {
  component2IdMock,
  externalLayoutsMock,
  layout1NameMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../testing/componentMocks';
import type { FormLayoutsResponse } from 'app-shared/types/api';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

const mockDefinitions = {
  rootElements: [
    {
      flowElements: [
        {
          $type: 'bpmn:Task',
          extensionElements: {
            values: [
              {
                $type: 'altinn:taskExtension',
                $children: [
                  {
                    $type: 'altinn:signatureConfig',
                    $children: [
                      {
                        $type: 'altinn:dataTypesToSign',
                        $children: [
                          {
                            $type: 'altinn:dataType',
                            $body: componentMocks[ComponentType.FileUpload].id,
                          },
                          {
                            $type: 'altinn:dataType',
                            $body: componentMocks[ComponentType.FileUploadWithTag].id,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

const moddle = {
  fromXML: jest.fn().mockResolvedValue({ rootElement: mockDefinitions }),
  toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
};

jest.mock('bpmn-moddle', () => jest.fn(() => moddle));

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

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
        const { result } = await renderDeleteFormComponentsMutation({
          queries: {
            getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
          },
        });

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

const renderDeleteFormComponentsMutation = async ({
  queries = {},
}: {
  queries?: Partial<ServicesContextProps>;
} = {}) => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  return renderHookWithProviders(
    () => useDeleteFormComponentMutation(org, app, selectedLayoutSet),
    {
      queries,
    },
  );
};
