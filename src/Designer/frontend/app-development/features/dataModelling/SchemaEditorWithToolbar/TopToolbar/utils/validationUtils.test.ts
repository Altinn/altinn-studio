import { mockAppMetadata, mockDataTypeId } from '../../../../../test/applicationMetadataMock';
import { extractDataTypeNamesFromAppMetadata } from './validationUtils';

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
