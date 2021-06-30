import 'jest';
import { IApplication, IInstance } from '../../../shared/src/types';
import { ILayoutSets } from '../../src/types';
import { getCurrentDataTypeForApplication, getLayoutSetIdForApplication, isStatelessApp } from '../../src/utils/appMetadata';

describe('>>> utils/appmetadata.ts', () => {
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
  const instance: Partial<IInstance> = {
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

  it('getCurrentDataTypeForApplication should return correct data type if we have an instance', () => {
    const result = getCurrentDataTypeForApplication(application, instance as IInstance, layoutSets);
    const expected = 'Datamodel';
    expect(result).toEqual(expected);
  });

  it('getCurrentDataTypeForApplication should return correct data type if we have a stateless app', () => {
    const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
    const result = getCurrentDataTypeForApplication(statelessApplication, null, layoutSets);
    const expected = 'Stateless';
    expect(result).toEqual(expected);
  });

  it('getLayoutSetIdForApplication should return correct layout set id if we have an instance', () => {
    const result = getLayoutSetIdForApplication(application, instance as IInstance, layoutSets);
    const expected = 'datamodel';
    expect(result).toEqual(expected);
  });

  it('getLayoutSetIdForApplication should return correct layout set id if we have a stateless app', () => {
    const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
    const result = getLayoutSetIdForApplication(statelessApplication, null, layoutSets);
    const expected = 'stateless';
    expect(result).toEqual(expected);
  });

  it('isStatelessApp should return true if enEntry with layout set is specified', () => {
    const statelessApplication = { ...application, onEntry: { show: 'stateless' } };
    const result = isStatelessApp(statelessApplication);
    expect(result).toBeTruthy();
  });

  it('isStatelessApp should return false if onEntry is not specified', () => {
    const result = isStatelessApp(application);
    expect(result).toBeFalsy();
  });
});
