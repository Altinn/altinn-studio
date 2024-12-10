import { mockAppMetadata, mockDataTypeId } from '../../../../../test/applicationMetadataMock';
import { extractDataTypeNamesFromAppMetadata, findFileNameError } from './validationUtils';

describe('extractDataTypeNamesFromAppMetadata', () => {
  it('should extract data type names when application metadata is provided', () => {
    const dataTypeNames = extractDataTypeNamesFromAppMetadata(mockAppMetadata);
    expect(dataTypeNames).toEqual([mockDataTypeId]);
  });

  it('should return an empty array when dataTypes is undefined', () => {
    const mockAppMetadataCopy = { ...mockAppMetadata };
    delete mockAppMetadataCopy.dataTypes;

    const dataTypeNames = extractDataTypeNamesFromAppMetadata(mockAppMetadataCopy);

    expect(dataTypeNames).toEqual([]);
  });

  it('should return an empty array when application metadata is undefined', () => {
    const dataTypeNames = extractDataTypeNamesFromAppMetadata(undefined);
    expect(dataTypeNames).toEqual([]);
  });
});

describe('findFileNameError', () => {
  it('should validate name as invalid if name does not match regEx', () => {
    const fileName = 'æ';
    const validationResult = findFileNameError(fileName, mockAppMetadata);
    expect(validationResult).toEqual('invalidFileName');
  });

  it('should validate name as invalid if name exists in appMetadata', () => {
    const fileName = mockAppMetadata.dataTypes[0].id;
    const validationResult = findFileNameError(fileName, mockAppMetadata);
    expect(validationResult).toEqual('fileExists');
  });

  it('should validate name as valid if appMetadata is undefined', () => {
    const fileName = 'fileName';
    const validationResult = findFileNameError(fileName, undefined);
    expect(validationResult).toEqual(null);
  });
});
