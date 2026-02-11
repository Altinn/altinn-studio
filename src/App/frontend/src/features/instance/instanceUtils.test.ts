import { jest } from '@jest/globals';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  getDataTypeByTaskId,
} from 'src/features/instance/instanceUtils';
import { IData } from 'src/types/shared';
import type { UiFolders } from 'src/features/form/layoutSets/types';

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

  const uiFolders: UiFolders = {
    Task_1: {
      defaultDataType: 'Datamodel',
    },
    stateless: {
      defaultDataType: 'Stateless',
    },
  };
  describe('getCurrentDataTypeForApplication', () => {
    it('should return correct data type if we have an instance', () => {
      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        uiFolders,
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
        uiFolders,
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
        uiFolders,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId in app metadata if no layout set is configured', () => {
      const uiFolders: UiFolders = {};
      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        uiFolders,
        taskId: 'Task_1',
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId based on data type defined in layout sets if the current task has this configured', () => {
      const uiFolders: UiFolders = {
        Task_2: {
          defaultDataType: 'Datamodel-for-confirm',
        },
      };

      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        uiFolders,
        taskId: 'Task_2',
      });
      const expected = 'Datamodel-for-confirm';
      expect(result).toEqual(expected);
    });

    it('should return datatype of custom receipt if the taskId points to custom receipt', () => {
      const uiFolders: UiFolders = {
        Task_2: {
          defaultDataType: 'Datamodel-for-confirm',
        },
        CustomReceipt: {
          defaultDataType: 'Datamodel-for-custom-receipt',
        },
      };

      const result = getCurrentDataTypeForApplication({
        isStateless: false,
        uiFolders,
        taskId: 'CustomReceipt',
      });
      const expected = 'Datamodel-for-custom-receipt';
      expect(result).toEqual(expected);
    });
  });

  describe('getCurrentTaskDataElementId', () => {
    const uiFolders: UiFolders = {};
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId({
        isStateless: false,
        dataElements: instance.data,
        uiFolders,
        taskId: 'Task_1',
      });
      expect(result).toEqual('datamodel-data-guid');
    });
  });

  describe('getDataTypeByTaskId', () => {
    it('should return undefined if taskId is undefined', () => {
      const result = getDataTypeByTaskId({
        taskId: undefined,
        uiFolders,
      });
      expect(result).toBeUndefined();
    });

    it('should return dataType from layout set when task matches', () => {
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        uiFolders,
      });
      expect(result).toEqual('Datamodel');
    });

    it('should return undefined when no layout set matches the task', () => {
      const result = getDataTypeByTaskId({
        taskId: 'NonExistentTask',
        uiFolders,
      });
      expect(result).toBeUndefined();
    });

    it('should log error and fallback to app metadata dataType when layout set dataType is not found in metadata', () => {
      const logErrorSpy = jest.spyOn(window, 'logError').mockImplementation(() => {});
      const uiFoldersWithInvalidDataType: UiFolders = {
        Task_1: {
          defaultDataType: 'InvalidDataType',
        },
      };
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        uiFolders: uiFoldersWithInvalidDataType,
      });
      // Should fallback to first dataType in metadata with classRef and matching taskId
      expect(result).toEqual('Datamodel');
      expect(logErrorSpy).toHaveBeenCalledWith(
        "Could not find data type 'InvalidDataType' from ui folder configuration in application metadata",
      );
      logErrorSpy.mockRestore();
    });

    it('should return dataType from metadata when no layout set is configured for task', () => {
      const emptyUiFolders: UiFolders = {};
      const result = getDataTypeByTaskId({
        taskId: 'Task_1',
        uiFolders: emptyUiFolders,
      });
      // Should find first dataType with classRef and matching taskId
      expect(result).toEqual('Datamodel');
    });

    it('should return undefined when task has no matching layout set and no dataType in metadata', () => {
      const emptyUiFolders: UiFolders = {};
      const result = getDataTypeByTaskId({
        taskId: 'Task_WithNoDataType',
        uiFolders: emptyUiFolders,
      });
      expect(result).toBeUndefined();
    });

    it('should match folder by task id', () => {
      const uiFolders: UiFolders = {
        Task_B: {
          defaultDataType: 'Datamodel',
        },
      };
      const result = getDataTypeByTaskId({
        taskId: 'Task_B',
        uiFolders,
      });
      expect(result).toEqual('Datamodel');
    });
  });
});
