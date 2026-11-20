import { vi } from 'vitest';
import type { BpmnContextProps } from '../../src/contexts/BpmnContext';
import { mockBpmnDetails } from './bpmnDetailsMock';
import type { BpmnApiContextProps } from '../../src/contexts/BpmnApiContext';
import { mockModelerRef } from './bpmnModelerMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

export const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  initialBpmnXml: mockBPMNXML,
  getUpdatedXml: vi.fn(),
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: vi.fn(),
  modelerRef: mockModelerRef as any,
  isReloadingRef: { current: false },
  isInitialized: true,
  setIsInitialized: vi.fn(),
};

export const mockLayoutSets: LayoutSets = [
  {
    id: 'testId',
    dataType: 'dataTypeId1',
    taskId: mockBpmnDetails.id,
  },
  {
    id: 'layoutSetId2',
    dataType: 'dataTypeId2',
    taskId: 'Task_2',
  },
];

export const mockBpmnApiContextValue: BpmnApiContextProps = {
  layoutSets: mockLayoutSets,
  pendingApiOperations: false,
  existingCustomReceiptLayoutSetId: undefined,
  availableDataTypeIds: [],
  availableDataModelIds: [],
  allDataModelIds: [],
  addLayoutSet: vi.fn(),
  deleteLayoutSet: vi.fn(),
  mutateLayoutSetId: vi.fn(),
  mutateDataTypes: vi.fn(),
  saveBpmn: vi.fn(),
  getSavedBpmn: vi.fn(),
  onProcessTaskRemove: vi.fn(),
  onProcessTaskAdd: vi.fn(),
};
