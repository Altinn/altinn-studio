import type { BpmnDetails } from '../../src/types/BpmnDetails';
import { BpmnTypeEnum } from '../../src/enum/BpmnTypeEnum';
import type { ModdleElement } from 'bpmn-js/lib/model/Types';

export const mockBpmnId: string = 'testId';
export const mockBpmnName: string = 'testName';

export const mockBpmnElement: ModdleElement = {
  businessObject: {
    extensionElements: {
      values: [
        {
          actions: {
            action: [
              {
                action: 'write',
              },
              {
                action: 'myServerAction',
                type: 'serverAction',
              },
            ]
          }
        },
      ],
    },
  },
};

export const mockBpmnDetails: BpmnDetails = {
  id: mockBpmnId,
  name: mockBpmnName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
  element: mockBpmnElement,
};
