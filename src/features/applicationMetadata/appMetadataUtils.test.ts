import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  getLayoutSetIdForApplication,
  isStatelessApp,
} from 'src/features/applicationMetadata/appMetadataUtils';
import type { IApplicationMetadata } from 'src/features/applicationMetadata/index';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IData } from 'src/types/shared';

describe('appMetadata.ts', () => {
  const application = getApplicationMetadataMock();
  application.dataTypes = [
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
  ];

  const instance = getInstanceDataMock();
  instance.data = [
    {
      id: 'datamodel-data-guid',
      instanceGuid: 'c23f7e5e-9f04-424f-9ffc-0e9aa14ad907',
      dataType: 'Datamodel',
      filename: null,
    } as unknown as IData,
  ];

  const layoutSets: ILayoutSets = {
    sets: [
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
    ],
  };

  describe('getCurrentDataTypeForApplication', () => {
    it('should return correct data type if we have an instance', () => {
      const result = getCurrentDataTypeForApplication({
        application,
        layoutSets,
        taskId: 'Task_1',
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if we have a stateless app', () => {
      const statelessApplication: IApplicationMetadata = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getCurrentDataTypeForApplication({
        application: statelessApplication,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if instance not set', () => {
      const statelessApplication: IApplicationMetadata = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getCurrentDataTypeForApplication({
        application: statelessApplication,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('getLayoutSetIdForApplication', () => {
    it('should return correct layout set id if we have an instance', () => {
      const result = getLayoutSetIdForApplication({ application, layoutSets, taskId: 'Task_1' });
      const expected = 'datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      const statelessApplication: IApplicationMetadata = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getLayoutSetIdForApplication({
        application: statelessApplication,
        layoutSets,
        taskId: undefined,
      });
      const expected = 'stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('isStatelessApp', () => {
    it('should return true if enEntry with layout set is specified', () => {
      const statelessApplication: IApplicationMetadata = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = isStatelessApp(statelessApplication);
      expect(result).toBeTruthy();
    });

    it('should return false if onEntry is not specified', () => {
      const result = isStatelessApp(application);
      expect(result).toBeFalsy();
    });

    it('should return false if routed to an instance', () => {
      window.location.replace('#/instance/123456/75154373-aed4-41f7-95b4-e5b5115c2edc');
      const result = isStatelessApp(application);
      expect(result).toBeFalsy();
    });
  });

  describe('getCurrentTaskDataElementId', () => {
    const layoutSets: ILayoutSets = { sets: [] };
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId({ application, instance, layoutSets, taskId: 'Task_1' });
      expect(result).toEqual('datamodel-data-guid');
    });
  });

  describe('getCurrentDataTypeId', () => {
    it('should return connected dataTypeId in app metadata if no layout set is configured', () => {
      const layoutSets: ILayoutSets = { sets: [] };
      const result = getCurrentDataTypeForApplication({ application, layoutSets, taskId: 'Task_1' });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId based on data type defined in layout sets if the current task has this configured', () => {
      const layoutSets: ILayoutSets = {
        sets: [
          {
            id: 'confirm',
            dataType: 'Datamodel-for-confirm',
            tasks: ['Task_2'],
          },
        ],
      };

      const result = getCurrentDataTypeForApplication({
        application,
        layoutSets,
        taskId: 'Task_2',
      });
      const expected = 'Datamodel-for-confirm';
      expect(result).toEqual(expected);
    });

    it('should return datatype of custom receipt if the taskId points to custom receipt', () => {
      const layoutSets: ILayoutSets = {
        sets: [
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
        ],
      };

      const result = getCurrentDataTypeForApplication({
        application,
        layoutSets,
        taskId: 'CustomReceipt',
      });
      const expected = 'Datamodel-for-custom-receipt';
      expect(result).toEqual(expected);
    });
  });
});
