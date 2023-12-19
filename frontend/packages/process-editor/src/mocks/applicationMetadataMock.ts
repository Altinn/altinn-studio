import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';

const mockOrg: string = 'org';
const mockAppId: string = 'id';
export const mockDataTypeId1: string = 'type1';
export const mockDataTypeTaskId1: string = 'oldTask';
const mockDataType1: DataTypeElement = { id: mockDataTypeId1, taskId: mockDataTypeTaskId1 };
export const mockDataTypes: DataTypeElement[] = [mockDataType1];
export const mockApplicationMetadata: ApplicationMetadata = {
  id: mockAppId,
  org: mockOrg,
  dataTypes: mockDataTypes,
};
