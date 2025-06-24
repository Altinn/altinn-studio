import {
  AttachmentWithDataType,
  DataTypeReference,
  filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes,
  getAttachmentsWithDataType,
  getRefAsPdfAttachments,
  toDisplayAttachments,
} from 'src/utils/attachmentsUtils';
import type { IData, IDataType, IDisplayAttachment } from 'src/types/shared';

describe(getAttachmentsWithDataType.name, () => {
  it('should map attachments to their corresponding data types', () => {
    const attachments: IData[] = [
      {
        id: '1',
        dataType: 'type1',
      },
      {
        id: '2',
        dataType: 'type2',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes: IDataType[] = [
      {
        id: 'type1',
        description: 'Type 1 description',
      },
      {
        id: 'type2',
        description: 'Type 2 description',
      },
    ] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'type1' },
        dataType: { id: 'type1', description: 'Type 1 description' },
      },
      {
        attachment: { id: '2', dataType: 'type2' },
        dataType: { id: 'type2', description: 'Type 2 description' },
      },
    ];

    const result = getAttachmentsWithDataType({
      attachments,
      appMetadataDataTypes,
    });

    expect(result).toEqual(expectedResult);
  });

  it('should return undefined for dataType when no matching data type is found', () => {
    const attachments: IData[] = [
      {
        id: '1',
        dataType: 'type1',
      },
      {
        id: '2',
        dataType: 'nonexistent-type',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes: IDataType[] = [
      {
        id: 'type1',
        description: 'Type 1 description',
      },
    ] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'type1' },
        dataType: { id: 'type1', description: 'Type 1 description' },
      },
      {
        attachment: { id: '2', dataType: 'nonexistent-type' },
        dataType: undefined,
      },
    ];

    const result = getAttachmentsWithDataType({
      attachments,
      appMetadataDataTypes,
    });

    expect(result).toEqual(expectedResult);
  });

  it('should handle empty attachments array', () => {
    const attachments: IData[] = [] as unknown as IData[];
    const appMetadataDataTypes: IDataType[] = [
      {
        id: 'type1',
        description: 'Type 1 description',
      },
    ] as unknown as IDataType[];

    const expectedResult = [];

    const result = getAttachmentsWithDataType({
      attachments,
      appMetadataDataTypes,
    });

    expect(result).toEqual(expectedResult);
  });

  it('should handle empty appMetadataDataTypes array', () => {
    const attachments: IData[] = [
      {
        id: '1',
        dataType: 'type1',
      },
    ] as unknown as IData[];
    const appMetadataDataTypes: IDataType[] = [] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'type1' },
        dataType: undefined,
      },
    ];

    const result = getAttachmentsWithDataType({
      attachments,
      appMetadataDataTypes,
    });

    expect(result).toEqual(expectedResult);
  });
});

describe(filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes.name, () => {
  it('filters out data types that have appLogic', () => {
    const data: IData[] = [
      {
        id: '1',
        dataType: 'does not have appLogic',
      },
      {
        id: '2',
        dataType: 'has appLogic',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes = [
      {
        id: 'does not have appLogic',
        appLogic: null,
      },
      {
        id: 'has appLogic',
        appLogic: {},
      },
    ] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'does not have appLogic' },
        dataType: { id: 'does not have appLogic', appLogic: null },
      },
    ];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes,
    });

    const result = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);

    expect(result).toEqual(expectedResult);
  });

  it('filters out data types that have allowedContributers app:owned', () => {
    const data: IData[] = [
      {
        id: '1',
        dataType: 'does not have app:owned',
      },
      {
        id: '2',
        dataType: 'has app:owned',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes = [
      {
        id: 'does not have app:owned',
        allowedContributers: ['something-else'],
      },
      {
        id: 'has app:owned',
        allowedContributers: ['app:owned'],
      },
    ] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'does not have app:owned' },
        dataType: { id: 'does not have app:owned', allowedContributers: ['something-else'] },
      },
    ];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes,
    });

    const result = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);

    expect(result).toEqual(expectedResult);
  });

  it('filters out data types that have allowedContributors app:owned', () => {
    const data: IData[] = [
      {
        id: '1',
        dataType: 'does not have app:owned',
      },
      {
        id: '2',
        dataType: 'has app:owned',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes = [
      {
        id: 'does not have app:owned',
        allowedContributors: ['something-else'],
      },
      {
        id: 'has app:owned',
        allowedContributors: ['app:owned'],
      },
    ] as unknown as IDataType[];

    const expectedResult = [
      {
        attachment: { id: '1', dataType: 'does not have app:owned' },
        dataType: {
          id: 'does not have app:owned',
          allowedContributors: ['something-else'],
        },
      },
    ];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes,
    });
    const result = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);

    expect(result).toEqual(expectedResult);
  });

  it('filters out data types that are ref-data-as-pdf', () => {
    const data = [
      {
        id: '1',
        dataType: DataTypeReference.RefDataAsPdf,
      },
      {
        id: '2',
        dataType: 'something-else',
      },
    ] as unknown as IData[];

    const expectedResult = [
      {
        attachment: {
          id: '2',
          dataType: 'something-else',
        },
        dataType: undefined,
      },
    ];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes: [],
    });
    const result = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);

    expect(result).toEqual(expectedResult);
  });

  it('filters out data types that are ref-data-as-pdf and have appLogic or allowedContributers app:owned', () => {
    const data = [
      {
        id: '1',
        dataType: DataTypeReference.RefDataAsPdf,
      },
      {
        id: '2',
        dataType: 'has app:owned',
      },
      {
        id: '3',
        dataType: 'has appLogic',
      },
    ] as unknown as IData[];

    const appMetadataDataTypes = [
      {
        id: 'has app:owned',
        allowedContributers: ['app:owned'],
      },
      {
        id: 'has appLogic',
        appLogic: {},
      },
    ] as unknown as IDataType[];

    const expectedResult = [];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes,
    });
    const result = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);

    expect(result).toEqual(expectedResult);
  });
});

describe(getRefAsPdfAttachments.name, () => {
  it('returns all pdf attachments', () => {
    const data = [
      {
        id: '1',
        dataType: DataTypeReference.RefDataAsPdf,
      },
      {
        id: '2',
        dataType: 'something-else',
      },
    ] as unknown as IData[];

    const expectedResult = [
      {
        attachment: {
          id: '1',
          dataType: DataTypeReference.RefDataAsPdf,
        },
        dataType: undefined,
      },
    ];

    const attachmentsWithDataType = getAttachmentsWithDataType({
      attachments: data,
      appMetadataDataTypes: [],
    });
    const result = getRefAsPdfAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });
});

describe(toDisplayAttachments.name, () => {
  it('should transform attachments with data types to display attachments', () => {
    const attachmentsWithDataType: AttachmentWithDataType[] = [
      {
        attachment: {
          id: '1',
          dataType: 'type1',
          filename: 'file1.pdf',
          selfLinks: {
            apps: 'https://example.com/file1.pdf',
          },
        } as unknown as IData,
        dataType: {
          id: 'type1',
          description: { nb: 'Type 1 description' },
          grouping: 'group1',
        } as unknown as IDataType,
      },
      {
        attachment: {
          id: '2',
          dataType: 'type2',
          filename: 'file2.jpg',
          selfLinks: {
            apps: 'https://example.com/file2.jpg',
          },
        } as unknown as IData,
        dataType: {
          id: 'type2',
          description: { nb: 'Type 2 description' },
          grouping: 'group2',
        } as unknown as IDataType,
      },
    ];

    const expectedResult: IDisplayAttachment[] = [
      {
        name: 'file1.pdf',
        url: 'https://example.com/file1.pdf',
        iconClass: 'reg reg-attachment',
        dataType: 'type1',
        grouping: 'group1',
        description: { nb: 'Type 1 description' },
      },
      {
        name: 'file2.jpg',
        url: 'https://example.com/file2.jpg',
        iconClass: 'reg reg-attachment',
        dataType: 'type2',
        grouping: 'group2',
        description: { nb: 'Type 2 description' },
      },
    ];

    const result = toDisplayAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });

  it('should handle undefined dataType', () => {
    const attachmentsWithDataType: AttachmentWithDataType[] = [
      {
        attachment: {
          id: '1',
          dataType: 'type1',
          filename: 'file1.pdf',
          selfLinks: {
            apps: 'https://example.com/file1.pdf',
          },
        } as unknown as IData,
        dataType: undefined,
      },
    ];

    const expectedResult: IDisplayAttachment[] = [
      {
        name: 'file1.pdf',
        url: 'https://example.com/file1.pdf',
        iconClass: 'reg reg-attachment',
        dataType: 'type1',
        grouping: undefined,
        description: undefined,
      },
    ];

    const result = toDisplayAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });

  it('should handle missing optional properties', () => {
    const attachmentsWithDataType: AttachmentWithDataType[] = [
      {
        attachment: {
          id: '1',
          dataType: 'type1',
          filename: 'file1.pdf',
          // Missing selfLinks
        } as unknown as IData,
        dataType: {
          id: 'type1',
          description: { nb: 'Type 1 description' },
          // Missing grouping
        } as unknown as IDataType,
      },
    ];

    const expectedResult: IDisplayAttachment[] = [
      {
        name: 'file1.pdf',
        url: undefined,
        iconClass: 'reg reg-attachment',
        dataType: 'type1',
        grouping: undefined,
        description: { nb: 'Type 1 description' },
      },
    ];

    const result = toDisplayAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });

  it('should handle empty array input', () => {
    const attachmentsWithDataType: AttachmentWithDataType[] = [];
    const expectedResult: IDisplayAttachment[] = [];

    const result = toDisplayAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });

  it('should handle missing filename', () => {
    const attachmentsWithDataType: AttachmentWithDataType[] = [
      {
        attachment: {
          id: '1',
          dataType: 'type1',
          // Missing filename
          selfLinks: {
            apps: 'https://example.com/file1.pdf',
          },
        } as unknown as IData,
        dataType: {
          id: 'type1',
          description: { nb: 'Type 1 description' },
          grouping: 'group1',
        } as unknown as IDataType,
      },
    ];

    const expectedResult: IDisplayAttachment[] = [
      {
        name: undefined,
        url: 'https://example.com/file1.pdf',
        iconClass: 'reg reg-attachment',
        dataType: 'type1',
        grouping: 'group1',
        description: { nb: 'Type 1 description' },
      },
    ];

    const result = toDisplayAttachments(attachmentsWithDataType);
    expect(result).toEqual(expectedResult);
  });
});
