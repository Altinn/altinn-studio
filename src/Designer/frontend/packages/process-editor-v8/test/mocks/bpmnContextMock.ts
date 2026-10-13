import { vi } from 'vitest';
import type { BpmnContextProps } from '../../src/contexts/BpmnContext';
import { mockBpmnDetails } from './bpmnDetailsMock';
import type { BpmnApiContextProps } from '../../src/contexts/BpmnApiContext';
import { mockModelerRef } from './bpmnModelerMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { AppVersion } from 'app-shared/types/AppVersion';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppVersion: AppVersion = {
  backendVersion: '8.9.0',
  frontendVersion: '4.25.2',
};

export const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  initialBpmnXml: mockBPMNXML,
  appVersion: mockAppVersion,
  getUpdatedXml: vi.fn(),
  isEditAllowed: true,
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
