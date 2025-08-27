import type { BpmnContextProps } from '@altinn/process-editor/contexts/BpmnContext';
import { mockBpmnDetails } from './bpmnDetailsMock';
import type { BpmnApiContextProps } from '@altinn/process-editor/contexts/BpmnApiContext';
import { mockModelerRef } from './bpmnModelerMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

export const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  initialBpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
  modelerRef: mockModelerRef as any,
  isInitialized: true,
  setIsInitialized: jest.fn(),
};

export const mockLayoutSets: LayoutSets = {
  sets: [
    {
      id: 'testId',
      dataType: 'dataTypeId1',
      tasks: [mockBpmnDetails.id],
    },
    {
      id: 'layoutSetId2',
      dataType: 'dataTypeId2',
      tasks: ['Task_2'],
    },
  ],
};

export const mockBpmnApiContextValue: BpmnApiContextProps = {
  layoutSets: mockLayoutSets,
  pendingApiOperations: false,
  existingCustomReceiptLayoutSetId: undefined,
  availableDataTypeIds: [],
  availableDataModelIds: [],
  allDataModelIds: [],
  addLayoutSet: jest.fn(),
  deleteLayoutSet: jest.fn(),
  mutateLayoutSetId: jest.fn(),
  mutateDataTypes: jest.fn(),
  saveBpmn: jest.fn(),
  onProcessTaskRemove: jest.fn(),
  onProcessTaskAdd: jest.fn(),
};
