import 'jest';
import { IApplication, IData, IInstance } from '../../../shared/src/types';
import { ILayoutSets } from '../../src/types';
import { getCurrentDataTypeForApplication, getCurrentTaskData, getCurrentTaskDataElementId, getLayoutSetIdForApplication, isStatelessApp } from '../../src/utils/appMetadata';

describe('utils/appmetadata.ts', () => {
  const application: IApplication = {
    id: 'ttd/stateless-app-demo',
    org: 'ttd',
    title: {
      nb: 'Valgkort 2021',
    },
    dataTypes: [
      {
        id: 'ref-data-as-pdf',
        allowedContentTypes: [
          'application/pdf',
        ],
        maxCount: 0,
        minCount: 0,
      },
      {
        id: 'Datamodel',
        allowedContentTypes: [
          'application/xml',
        ],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.StatelessV1',
        },
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
    ],
    partyTypesAllowed: {
      bankruptcyEstate: false,
      organisation: false,
      person: false,
      subUnit: false,
    },
    created: '2021-04-28T13:31:24.7328286Z',
    createdBy: 'lorang92',
    lastChanged: '2021-04-28T13:31:24.7328296Z',
    lastChangedBy: 'lorang92',
  };
  const instance: IInstance = {
    id: '512345/c32dc48c-7854-45ec-a32e-2a82c420c9bd',
    instanceOwner: {
      partyId: '512345',
      personNumber: '01017512345',
      organisationNumber: null,
    },
    appId: 'ttd/stateless-app-demo',
    org: 'ttd',
    selfLinks: { apps: '', platform: '' },
    dueBefore: null,
    process: {
      startEvent: 'StartEvent_1',
      currentTask: {
        flow: 2, elementId: 'Task_1', name: 'Utfylling', altinnTaskType: 'data',
      },
    } as any,
    created: undefined,
    data: [
      {
          "id": "datamodel-data-guid",
          "instanceGuid": "c23f7e5e-9f04-424f-9ffc-0e9aa14ad907",
          "dataType": "Datamodel",
          "filename": null,
      } as IData,
  ],
    instanceState: undefined,
    lastChanged: undefined,
    status: undefined,
    title: undefined
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
      const result = getCurrentDataTypeForApplication(application, instance, layoutSets);
      const expected = 'Datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct data type if we have a stateless app', () => {
      const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
      const result = getCurrentDataTypeForApplication(statelessApplication, null, layoutSets);
      const expected = 'Stateless';
      expect(result).toEqual(expected);
    });
  })

  describe('getLayoutSetIdForApplication', () => {
    it('should return correct layout set id if we have an instance', () => {
      const result = getLayoutSetIdForApplication(application, instance, layoutSets);
      const expected = 'datamodel';
      expect(result).toEqual(expected);
    });

    it('should return correct layout set id if we have a stateless app', () => {
      const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
      const result = getLayoutSetIdForApplication(statelessApplication, null, layoutSets);
      const expected = 'stateless';
      expect(result).toEqual(expected);
    });
  });

  describe('isStatelessApp', () => {
    it('should return true if enEntry with layout set is specified', () => {
      const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
      const result = isStatelessApp(statelessApplication);
      expect(result).toBeTruthy();
    });

    it('should return false if onEntry is not specified', () => {
      const result = isStatelessApp(application);
      expect(result).toBeFalsy();
    });

    it('should return false if routed to an instance', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        hash: '#/instance/123456/some-guid',
      };
      const result = isStatelessApp(application);
      expect(result).toBeFalsy();
    });
  })

  describe('getCurrentTaskDataElementId', () => {
    it('should return current task data element id', () => {
      const result = getCurrentTaskDataElementId(application, instance);
      expect(result).toEqual('datamodel-data-guid');
    });
  })

  describe('getCurrentTaskData', () => {
    it('should return current task data', () => {
      const result = getCurrentTaskData(application, instance);
      const expected = instance.data.find((e) => e.id === 'datamodel-data-guid');
      expect(result).toEqual(expected);
    });
  });
});
