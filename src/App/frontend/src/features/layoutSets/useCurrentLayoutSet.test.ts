import { jest } from '@jest/globals';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { LayoutSet } from 'src/features/layoutSets/types';
import { getCurrentLayoutSet } from 'src/features/layoutSets/useCurrentLayoutSet';
import { IData } from 'src/types/shared';

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

  const layoutSets: LayoutSet[] = [
    {
      id: 'datamodel',
      tasks: ['Task_1'],
      dataType: 'Datamodel',
    },
    {
      id: 'stateless',
      dataType: 'Stateless',
      tasks: [],
    },
  ];

  describe('getCurrentLayoutSet', () => {
    it('should return correct layout set id if we have an instance', () => {
      jest.mocked(getApplicationMetadata).mockImplementation(() => mockedAppMetadata);

      const result = getCurrentLayoutSet({
        isStateless: false,
        layoutSets,
        taskId: 'Task_1',
      });
      const expected = 'datamodel';
      expect(result?.id).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      jest
        .mocked(getApplicationMetadata)
        .mockImplementation(() => ({ ...mockedAppMetadata, onEntry: { show: 'stateless' } }));

      const result = getCurrentLayoutSet({
        isStateless: true,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'stateless';
      expect(result?.id).toEqual(expected);
    });
  });
});
