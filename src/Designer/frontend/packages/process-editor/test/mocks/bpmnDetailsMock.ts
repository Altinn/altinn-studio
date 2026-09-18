import type { BpmnDetails } from '../../src/types/BpmnDetails';
import { BpmnTypeEnum } from '../../src/enum/BpmnTypeEnum';
import type { ModdleElement } from 'bpmn-js/lib/model/Types';
import type { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';

export const mockBpmnId: string = 'testTaskId';
export const mockBpmnName: string = 'testTaskName';

const taskExtensionType: string = 'altinn:TaskExtension';

export const mockBpmnElementForDataTask: ModdleElement = {
  id: 'testElementId',
  businessObject: {
    extensionElements: {
      values: [
        {
          $type: taskExtensionType,
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
      return mockBpmnElementForDataTask;
    case 'confirmation':
      return {
        businessObject: {
          extensionElements: {
            values: [
              {
                $type: taskExtensionType,
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
                $type: taskExtensionType,
                actions: signingActions,
                signatureConfig: {
                  signatureDataType: 'signatureInformation-1234',
                  dataTypesToSign: [],
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
                $type: taskExtensionType,
                actions: paymentActions,
                paymentConfig: {
                  paymentDataType: 'paymentInformation-1234',
                  paymentReceiptPdfDataType: 'paymentReceiptPdf-1234',
                },
              },
            ],
          },
        },
      };
    case 'pdf':
      return {
        businessObject: {
          extensionElements: {
            values: [
              {
                $type: taskExtensionType,
                taskType: 'pdf',
                pdfConfig: {},
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

export const mockSigneeStatesDataTypeId: string = 'signees-states-1234';
export const mockSigningPdfDataTypeId: string = 'signatures-pdf-1234';

export const mockBpmnElementForUserControlledSigningTask: ModdleElement = {
  businessObject: {
    extensionElements: {
      values: [
        {
          $type: taskExtensionType,
          actions: signingActions,
          signatureConfig: {
            signatureDataType: 'signatureInformation-1234',
            dataTypesToSign: [],
            signeeStatesDataTypeId: mockSigneeStatesDataTypeId,
            signeeProviderId: '',
            signingPdfDataType: mockSigningPdfDataTypeId,
          },
        },
      ],
    },
  },
};

/** A signing task that generates a pdf without being user controlled. */
export const mockBpmnElementForSigningTaskWithPdf: ModdleElement = {
  businessObject: {
    extensionElements: {
      values: [
        {
          $type: taskExtensionType,
          actions: signingActions,
          signatureConfig: {
            signatureDataType: 'signatureInformation-1234',
            dataTypesToSign: [],
            signingPdfDataType: mockSigningPdfDataTypeId,
          },
        },
      ],
    },
  },
};
