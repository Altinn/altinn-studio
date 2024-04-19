import type {BpmnContextProps} from "../../src/contexts/BpmnContext";
import {mockBpmnDetails} from "./bpmnDetailsMock";
import type {BpmnApiContextProps} from "../../src/contexts/BpmnApiContext";
import {mockModelerRef} from "./bpmnModelerMock";

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

export const mockBpmnContextValue: BpmnContextProps = {
    bpmnXml: mockBPMNXML,
    appLibVersion: mockAppLibVersion8,
    getUpdatedXml: jest.fn(),
    isEditAllowed: true,
    bpmnDetails: mockBpmnDetails,
    setBpmnDetails: jest.fn(),
    modelerRef: mockModelerRef
};

export const mockBpmnApiContextValue: BpmnApiContextProps = {
    layoutSets: { sets: [] },
    pendingApiOperations: false,
    existingCustomReceiptLayoutSetName: undefined,
    addLayoutSet: jest.fn(),
    deleteLayoutSet: jest.fn(),
    mutateLayoutSet: jest.fn(),
    saveBpmn: jest.fn(),
};