import type { BpmnDetails } from '../../src/types/BpmnDetails';
import { BpmnTypeEnum } from '../../src/enum/BpmnTypeEnum';
import type { ModdleElement } from 'bpmn-js/lib/model/Types';
import type { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';

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
              {
                action: 'myProcessAction',
                type: 'processAction',
              },
            ],
          },
        },
      ],
    },
  },
};

export const getMockBpmnElementForTask = (taskType: BpmnTaskType) => {
  switch (taskType) {
    case 'data':
      return mockBpmnElement;
    case 'confirmation':
      return {
        businessObject: {
          extensionElements: {
            values: [
              {
                actions: confirmationActions,
              },
            ],
          },
        },
      };
    case 'signing':
      return {
        businessObject: {
          extensionElements: {
            values: [
              {
                actions: signingActions,
                signatureConfig: {
                  signatureDataType: {
                    dataType: {
                      dataType: 'signatureInformation-1234',
                    },
                  },
                },
              },
            ],
          },
        },
      };
    case 'payment':
      return {
        businessObject: {
          extensionElements: {
            values: [
              {
                actions: paymentActions,
                paymentConfig: {
                  paymentDataType: {
                    dataType: {
                      dataType: 'paymentInformation-1234',
                    },
                  },
                },
              },
            ],
          },
        },
      };
  }
};

export const mockBpmnDetails: BpmnDetails = {
  id: mockBpmnId,
  name: mockBpmnName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
  element: getMockBpmnElementForTask('data'),
};

export const confirmationActions = {
  actions: {
    action: [
      {
        action: 'confirm',
      },
    ],
  },
};

export const signingActions = {
  actions: {
    action: [
      {
        action: 'sign',
      },
      {
        action: 'reject',
      },
    ],
  },
};

export const paymentActions = {
  actions: {
    action: [
      {
        action: 'pay',
      },
      {
        action: 'reject',
      },
      {
        action: 'confirm',
      },
    ],
  },
};
