import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../queries/useFormLayoutSettingsQuery';
import { useDeleteFormContainerMutation } from './useDeleteFormContainerMutation';
import {
  component1IdMock,
  component2IdMock,
  component3IdMock,
  container1IdMock,
  container2IdMock,
  externalLayoutsMock,
  layout1NameMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const id = container1IdMock;

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

describe('useDeleteFormContainerMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Should save layout without deleted container and send componentIds that has been deleted for syncing', async () => {
    const { result } = await renderDeleteFormContainerMutation();
    await result.current.mutateAsync(id);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: [
          {
            oldComponentId: component1IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: id,
            newComponentId: undefined,
          },
        ],
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ id })]),
          }),
        }),
      },
    );
  });

  it('Should remove deleted data types from signing tasks', async () => {
    const { result } = await renderDeleteFormContainerMutation({
      queries: {
        getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
      },
    });

    const containerToDelete = container2IdMock;
    await result.current.mutateAsync(containerToDelete);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: [
          {
            oldComponentId: component2IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: component3IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: componentMocks[ComponentType.FileUploadWithTag].id,
            newComponentId: undefined,
          },
          {
            oldComponentId: containerToDelete,
            newComponentId: undefined,
          },
        ],
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ containerToDelete })]),
          }),
        }),
      },
    );

    expect(queriesMock.updateBpmnXml).toHaveBeenCalledTimes(1);
  });
});

const renderDeleteFormContainerMutation = async ({
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

  const formLayoutsSettingsResult = renderHookWithProviders(() =>
    useFormLayoutSettingsQuery(org, app, selectedLayoutSet),
  ).result;
  await waitFor(() => expect(formLayoutsSettingsResult.current.isSuccess).toBe(true));

  return renderHookWithProviders(
    () => useDeleteFormContainerMutation(org, app, selectedLayoutSet),
    {
      queries,
    },
  );
};
