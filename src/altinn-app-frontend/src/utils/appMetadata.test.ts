import { instanceOwner, partyTypesAllowed } from '__mocks__/constants';

import {
  getCurrentDataTypeForApplication,
  getCurrentDataTypeId,
  getCurrentTaskData,
  getCurrentTaskDataElementId,
  getLayoutSetIdForApplication,
  isStatelessApp,
} from 'src/utils/appMetadata';
import type { ILayoutSets } from 'src/types';

import type { IApplication, IData, IInstance } from 'altinn-shared/types';

describe('appMetadata.ts', () => {
  const application: IApplication = {
    id: 'ttd/stateless-app-demo',
    org: 'ttd',
    title: {
      nb: 'Valgkort 2021',
    },
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
        id: 'type-with-no-classRef',
        allowedContentTypes: ['application/xml'],
        appLogic: {},
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
    ],
    partyTypesAllowed,
    created: '2021-04-28T13:31:24.7328286Z',
    createdBy: 'lorang92',
    lastChanged: '2021-04-28T13:31:24.7328296Z',
    lastChangedBy: 'lorang92',
  };
  const instance: IInstance = {
    id: '512345/c32dc48c-7854-45ec-a32e-2a82c420c9bd',
    instanceOwner,
    appId: 'ttd/stateless-app-demo',
    org: 'ttd',
    selfLinks: { apps: '', platform: '' },
    dueBefore: null,
    process: {
      startEvent: 'StartEvent_1',
      currentTask: {
        flow: 2,
        elementId: 'Task_1',
        name: 'Utfylling',
        altinnTaskType: 'data',
      },
    } as any,
    created: undefined,
    data: [
      {
        id: 'datamodel-data-guid',
        instanceGuid: 'c23f7e5e-9f04-424f-9ffc-0e9aa14ad907',
        dataType: 'Datamodel',
        filename: null,
      } as IData,
    ],
    instanceState: undefined,
    lastChanged: undefined,
    status: undefined,
    title: undefined,
  };

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
        instance,
        layoutSets,
      });
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if we have a stateless app', () => {
      const statelessApplication = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getCurrentDataTypeForApplication({
        application: statelessApplication,
        instance: null,
        layoutSets,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if instance not set', () => {
      const statelessApplication = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getCurrentDataTypeForApplication({
        application: statelessApplication,
        layoutSets,
      });
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('getLayoutSetIdForApplication', () => {
    it('should return correct layout set id if we have an instance', () => {
      const result = getLayoutSetIdForApplication(
        application,
        instance,
        layoutSets,
      );
      const expected = 'datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      const statelessApplication = {
        ...application,
        onEntry: { show: 'stateless' },
      };
      const result = getLayoutSetIdForApplication(
        statelessApplication,
        null,
        layoutSets,
      );
      const expected = 'stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('isStatelessApp', () => {
    it('should return true if enEntry with layout set is specified', () => {
      const statelessApplication = {
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
      window.location.replace(
        '#/instance/123456/75154373-aed4-41f7-95b4-e5b5115c2edc',
      );
      const result = isStatelessApp(application);
      expect(result).toBeFalsy();
    });
  });

  describe('getCurrentTaskDataElementId', () => {
    const layoutSets: ILayoutSets = { sets: [] };
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId(
        application,
        instance,
        layoutSets,
      );
      expect(result).toEqual('datamodel-data-guid');
    });
  });

  describe('getCurrentTaskData', () => {
    const layoutSets: ILayoutSets = { sets: [] };
    it('should return current task data', () => {
      const result = getCurrentTaskData(application, instance, layoutSets);
      const expected = instance.data.find(
        (e) => e.id === 'datamodel-data-guid',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getCurrentDataTypeId', () => {
    it('should return connected dataTypeId in app metadata if no layout set is configured', () => {
      const layoutSets: ILayoutSets = { sets: [] };
      const result = getCurrentDataTypeId(application, instance, layoutSets);
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return connected dataTypeId based on data type defined in layout sets if the current task has this configured', () => {
      const instanceInConfirm: IInstance = {
        ...instance,
        process: {
          ...instance.process,
          currentTask: {
            ...instance.process.currentTask,
            flow: 3,
            elementId: 'Task_2',
            name: 'Bekreftelse',
            altinnTaskType: 'confirm',
          },
        },
      };

      const layoutSets: ILayoutSets = {
        sets: [
          {
            id: 'confirm',
            dataType: 'Datamodel-for-confirm',
            tasks: ['Task_2'],
          },
        ],
      };

      const result = getCurrentDataTypeId(
        application,
        instanceInConfirm,
        layoutSets,
      );
      const expected = 'Datamodel-for-confirm';
      expect(result).toEqual(expected);
    });
  });
});
