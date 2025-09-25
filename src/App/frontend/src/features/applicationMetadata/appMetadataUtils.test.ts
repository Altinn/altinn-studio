import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import {
  getCurrentDataTypeForApplication,
  getCurrentLayoutSet,
  getCurrentTaskDataElementId,
} from 'src/features/applicationMetadata/appMetadataUtils';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { ILayoutSet } from 'src/layout/common.generated';
import type { IData } from 'src/types/shared';

describe('appMetadata.ts', () => {
  const incomingAppMetadata = getIncomingApplicationMetadataMock({
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
  const appMetadata: ApplicationMetadata = {
    ...incomingAppMetadata,
    isStatelessApp: false,
    isValidVersion: true,
    logoOptions: incomingAppMetadata.logo,
    onEntry: { show: 'new-instance' },
  };

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
        application: appMetadata,
        layoutSets,
        taskId: 'Task_1',
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if we have a stateless app', () => {
      const result = getCurrentDataTypeForApplication({
        application: { ...appMetadata, isStatelessApp: true, onEntry: { show: 'stateless' } },
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if instance not set', () => {
      const result = getCurrentDataTypeForApplication({
        application: { ...appMetadata, isStatelessApp: true, onEntry: { show: 'stateless' } },
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('getCurrentLayoutSet', () => {
    it('should return correct layout set id if we have an instance', () => {
      const result = getCurrentLayoutSet({ application: appMetadata, layoutSets, taskId: 'Task_1' });
      const expected = 'datamodel';
      expect(result?.id).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      const result = getCurrentLayoutSet({
        application: { ...appMetadata, isStatelessApp: true, onEntry: { show: 'stateless' } },
        layoutSets,
        taskId: undefined,
      });
      const expected = 'stateless';
      expect(result?.id).toEqual(expected);
    });
  });

  describe('getCurrentTaskDataElementId', () => {
    const layoutSets: ILayoutSet[] = [];
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId({
        application: appMetadata,
        dataElements: instance.data,
        layoutSets,
        taskId: 'Task_1',
      });
      expect(result).toEqual('datamodel-data-guid');
    });
  });

  describe('getCurrentDataTypeId', () => {
    it('should return connected dataTypeId in app metadata if no layout set is configured', () => {
      const layoutSets: ILayoutSet[] = [];
      const result = getCurrentDataTypeForApplication({
        application: appMetadata,
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
        application: appMetadata,
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
        application: appMetadata,
        layoutSets,
        taskId: 'CustomReceipt',
      });
      const expected = 'Datamodel-for-custom-receipt';
      expect(result).toEqual(expected);
    });
  });
});
