import { DataTypeReference, filterAttachments, getRefAsPdfAttachments } from 'src/utils/attachmentsUtils';
import type { IData, IDataType } from 'src/types/shared';

describe(filterAttachments.name, () => {
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

    const expectedResult = [{ id: '1', dataType: 'does not have appLogic' }];

    const result = filterAttachments({
      data,
      appMetadataDataTypes,
    });

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

    const expectedResult = [{ id: '1', dataType: 'does not have app:owned' }];

    const result = filterAttachments({
      data,
      appMetadataDataTypes,
    });

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

    const expectedResult = [{ id: '1', dataType: 'does not have app:owned' }];

    const result = filterAttachments({
      data,
      appMetadataDataTypes,
    });

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
        id: '2',
        dataType: 'something-else',
      },
    ];

    const result = filterAttachments({
      data,
      appMetadataDataTypes: [],
    });

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

    const result = filterAttachments({
      data,
      appMetadataDataTypes,
    });

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
        id: '1',
        dataType: DataTypeReference.RefDataAsPdf,
      },
    ];

    const result = getRefAsPdfAttachments(data);
    expect(result).toEqual(expectedResult);
  });
});
