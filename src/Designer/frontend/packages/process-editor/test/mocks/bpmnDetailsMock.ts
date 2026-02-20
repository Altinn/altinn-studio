import type { BpmnDetails } from '../../src/types/BpmnDetails';
import { BpmnTypeEnum } from '../../src/enum/BpmnTypeEnum';
import type { Element, ModdleElement } from 'bpmn-js/lib/model/Types';
import type { BpmnTaskType } from '../../src/types/BpmnTaskType';
import type { SignatureConfig } from '../../src/types/SignatureConfig';

export const mockBpmnId: string = 'testTaskId';
export const mockBpmnName: string = 'testTaskName';

export const mockBpmnElementForDataTask: ModdleElement = {
  id: 'testElementId',
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

export const getMockBpmnElementForSigningTask = (
  signatureConfig?: Partial<SignatureConfig>,
): ModdleElement => {
  const defaultSignatureConfig: SignatureConfig = {
    signatureDataType: 'signature-123',
    dataTypesToSign: { dataTypes: [] },
  };
  const extensionElements = {
    values: [
      {
        taskType: 'signing',
        actions: signingActions,
        signatureConfig: {
          ...defaultSignatureConfig,
          ...signatureConfig,
        },
      },
    ],
  };
  return {
    businessObject: {
      extensionElements,
    },
  } as Element;
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
