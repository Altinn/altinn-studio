import { jest } from '@jest/globals';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { getCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { IData } from 'src/types/shared';
import type { UiFolders } from 'src/features/form/layoutSets/types';

describe('useCurrentLayoutSet.ts', () => {
  const mockedAppMetadata = getApplicationMetadataMock({
    dataTypes: [
      {
        id: 'Datamodel',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.StatelessV1',
        },
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
      {
        id: 'Stateless',
        allowedContentTypes: ['application/xml'],
        appLogic: {},
        maxCount: 1,
        minCount: 1,
      },
    ],
  });

  const instance = getInstanceDataMock();
  instance.data = [
    {
      id: 'datamodel-data-guid',
      instanceGuid: 'c23f7e5e-9f04-424f-9ffc-0e9aa14ad907',
      dataType: 'Datamodel',
      filename: null,
    } as unknown as IData,
  ];

  const uiFolders: UiFolders = {
    Task_1: {
      defaultDataType: 'Datamodel',
    },
    stateless: {
      defaultDataType: 'Stateless',
    },
  };

  describe('getCurrentLayoutSet', () => {
    it('should return correct layout set id if we have an instance', () => {
      jest.mocked(getApplicationMetadata).mockImplementation(() => mockedAppMetadata);

      const result = getCurrentLayoutSet({
        isStateless: false,
        uiFolders,
        taskId: 'Task_1',
      });
      const expected = 'Task_1';
      expect(result?.id).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      jest
        .mocked(getApplicationMetadata)
        .mockImplementation(() => ({ ...mockedAppMetadata, onEntry: { show: 'stateless' } }));

      const result = getCurrentLayoutSet({
        isStateless: true,
        uiFolders,
        taskId: undefined,
      });
      const expected = 'stateless';
      expect(result?.id).toEqual(expected);
    });

    it('should resolve the UI folder by task id even without defaultDataType', () => {
      jest.mocked(getApplicationMetadata).mockImplementation(() => mockedAppMetadata);

      const result = getCurrentLayoutSet({
        isStateless: false,
        uiFolders: { Task_2: {} },
        taskId: 'Task_2',
      });

      expect(result?.id).toEqual('Task_2');
    });
  });
});
