import { BpmnDetails } from '../types/BpmnDetails';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

const mockBpmnId: string = 'testId';
const mockName: string = 'testName';

export const mockBpmnDetails: BpmnDetails = {
  id: mockBpmnId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};
