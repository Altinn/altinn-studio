import { jest } from '@jest/globals';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  getDataTypeByTaskId,
} from 'src/features/instance/instanceUtils';
import { ILayoutSet } from 'src/layout/common.generated';
import { IData } from 'src/types/shared';

describe('instanceUtils.ts', () => {
  const mockedAppMetadata = getApplicationMetadataMock({
    dataTypes: [
      {
        id: 'ref-data-as-pdf',
        allowedContentTypes: ['application/pdf'],
        maxCount: 0,
        minCount: 0,
      },
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
        id: 'Datamodel-for-confirm',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Confirm',
        },
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
      {
        id: 'Datamodel-for-custom-receipt',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Confirm',
        },
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
      {
        id: 'type-with-no-classRef',
        allowedContentTypes: ['application/xml'],
        appLogic: {},
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
  jest.mocked(getApplicationMetadata).mockImplementation(() => mockedAppMetadata);

  const instance = getInstanceDataMock();
  instance.data = [
    {
      id: 'datamodel-data-guid',
      instanceGuid: 'c23f7e5e-9f04-424f-9ffc-0e9aa14ad907',
      dataType: 'Datamodel',
      filename: null,
    } as unknown as IData,
  ];

  const layoutSets: ILayoutSet[] = [
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
  describe('getCurrentDataTypeForApplication', () => {
    it('should return correct data type if we have an instance', () => {
      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        layoutSets,
        taskId: 'Task_1',
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if we have a stateless app', () => {
      jest
        .mocked(getApplicationMetadata)
        .mockImplementationOnce(() => ({ ...mockedAppMetadata, onEntry: { show: 'stateless' } }));
      const result = getCurrentDataTypeForApplication({
        isStateless: true,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if instance not set', () => {
      jest
        .mocked(getApplicationMetadata)
        .mockImplementationOnce(() => ({ ...mockedAppMetadata, onEntry: { show: 'stateless' } }));
      const result = getCurrentDataTypeForApplication({
        isStateless: true,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId in app metadata if no layout set is configured', () => {
      const layoutSets: ILayoutSet[] = [];
      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        layoutSets,
        taskId: 'Task_1',
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId based on data type defined in layout sets if the current task has this configured', () => {
      const layoutSets: ILayoutSet[] = [
        {
          id: 'confirm',
          dataType: 'Datamodel-for-confirm',
          tasks: ['Task_2'],
        },
      ];

      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        layoutSets,
        taskId: 'Task_2',
      });
      const expected = 'Datamodel-for-confirm';
      expect(result).toEqual(expected);
    });

    it('should return datatype of custom receipt if the taskId points to custom receipt', () => {
      const layoutSets: ILayoutSet[] = [
        {
          id: 'confirm',
          dataType: 'Datamodel-for-confirm',
          tasks: ['Task_2'],
        },
        {
          id: 'custom-receipt',
          dataType: 'Datamodel-for-custom-receipt',
          tasks: ['CustomReceipt'],
        },
      ];

      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        layoutSets,
        taskId: 'CustomReceipt',
      });
      const expected = 'Datamodel-for-custom-receipt';
      expect(result).toEqual(expected);
    });
  });

  describe('getCurrentTaskDataElementId', () => {
    const layoutSets: ILayoutSet[] = [];
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId({
        isStateless: false,
        dataElements: instance.data,
        layoutSets,
        taskId: 'Task_1',
      });
      expect(result).toEqual('datamodel-data-guid');
    });
  });

  describe('getDataTypeByTaskId', () => {
    it('should return undefined if taskId is undefined', () => {
      const result = getDataTypeByTaskId({
        taskId: undefined,
        layoutSets,
      });
      expect(result).toBeUndefined();
    });

    it('should return dataType from layout set when task matches', () => {
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        layoutSets,
      });
      expect(result).toEqual('Datamodel');
    });

    it('should return undefined when no layout set matches the task', () => {
      const result = getDataTypeByTaskId({
        taskId: 'NonExistentTask',
        layoutSets,
      });
      expect(result).toBeUndefined();
    });

    it('should log error and fallback to app metadata dataType when layout set dataType is not found in metadata', () => {
      const logErrorSpy = jest.spyOn(window, 'logError').mockImplementation(() => {});
      const layoutSetsWithInvalidDataType: ILayoutSet[] = [
        {
          id: 'test-set',
          tasks: ['Task_1'],
          dataType: 'InvalidDataType',
        },
      ];
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        layoutSets: layoutSetsWithInvalidDataType,
      });
      // Should fallback to first dataType in metadata with classRef and matching taskId
      expect(result).toEqual('Datamodel');
      expect(logErrorSpy).toHaveBeenCalledWith(
        "Could not find data type 'InvalidDataType' from layout-set configuration in application metadata",
      );
      logErrorSpy.mockRestore();
    });

    it('should return dataType from metadata when no layout set is configured for task', () => {
      const emptyLayoutSets: ILayoutSet[] = [];
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        layoutSets: emptyLayoutSets,
      });
      // Should find first dataType with classRef and matching taskId
      expect(result).toEqual('Datamodel');
    });

    it('should return undefined when task has no matching layout set and no dataType in metadata', () => {
      const emptyLayoutSets: ILayoutSet[] = [];
      const result = getDataTypeByTaskId({
        taskId: 'Task_WithNoDataType',
        layoutSets: emptyLayoutSets,
      });
      expect(result).toBeUndefined();
    });

    it('should match task from layout set tasks array', () => {
      const multiTaskLayoutSets: ILayoutSet[] = [
        {
          id: 'multi-task-set',
          tasks: ['Task_A', 'Task_B', 'Task_C'],
          dataType: 'Datamodel',
        },
      ];
      const result = getDataTypeByTaskId({
        taskId: 'Task_B',
        layoutSets: multiTaskLayoutSets,
      });
      expect(result).toEqual('Datamodel');
    });
  });
});
