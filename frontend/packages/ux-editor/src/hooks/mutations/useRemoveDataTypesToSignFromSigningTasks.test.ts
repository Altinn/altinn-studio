import { act, waitFor } from '@testing-library/react';
import { useRemoveDataTypesToSignFromSigningTasks } from './useRemoveDataTypesToSignFromSigningTasks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { app, org } from '@studio/testing/testids';

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
                          { $type: 'altinn:dataType', $body: 'dataType1' },
                          { $type: 'altinn:dataType', $body: 'dataType2' },
                          { $type: 'altinn:dataType', $body: 'dataType3' },
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

describe('useRemoveDataTypesToSignFromSigningTasks', () => {
  it('should call refetchBpmn and mutateBpmn with correct data', async () => {
    const { result } = renderHookWithProviders(
      () => useRemoveDataTypesToSignFromSigningTasks(org, app),
      {
        queries: {
          getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
        },
      },
    );

    await act(async () => {
      await result.current(['dataType1']);
    });

    await waitFor(() => expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML));

    const updatedDefinitions = JSON.parse(JSON.stringify(mockDefinitions));
    updatedDefinitions.rootElements[0].flowElements[0].extensionElements.values[0].$children[0].$children[0].$children =
      updatedDefinitions.rootElements[0].flowElements[0].extensionElements.values[0].$children[0].$children[0].$children.filter(
        (dataType) => dataType.$body !== 'dataType1',
      );

    expect(moddle.toXML).toHaveBeenCalledWith(updatedDefinitions, { format: true });

    expect(queriesMock.updateBpmnXml).toHaveBeenCalled();
  });
});
