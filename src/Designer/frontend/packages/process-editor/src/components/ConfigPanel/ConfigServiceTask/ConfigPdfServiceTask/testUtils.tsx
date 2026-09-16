import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

export type PdfBpmnDetailsConfig = {
  filenameTextResourceKey?: string;
  taskIds?: string[];
};

export const createPdfBpmnDetails = (config: PdfBpmnDetailsConfig = {}): BpmnDetails => {
  const { filenameTextResourceKey = '', taskIds = [] } = config;
  return {
    ...mockBpmnDetails,
    taskType: 'pdf',
    element: {
      ...mockBpmnDetails.element,
      businessObject: {
        ...mockBpmnDetails.element.businessObject,
        extensionElements: {
          values: [
            {
              pdfConfig: {
                filenameTextResourceKey: filenameTextResourceKey
                  ? { value: filenameTextResourceKey }
                  : undefined,
                autoPdfTaskIds: {
                  taskIds: taskIds.map((id) => ({ value: id })),
                },
              },
            },
          ],
        },
      },
    },
  };
};
