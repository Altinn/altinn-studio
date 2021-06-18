import { IInstanceDataState } from '../src/shared/resources/instanceData/instanceDataReducers';

export function getInstanceDataStateMock(customStates?: Partial<IInstanceDataState>): IInstanceDataState {
  const mockInstanceDataState: IInstanceDataState = {
    error: null,
    instance: {
      instanceOwner: {
        partyId: '12345',
        personNumber: '01017512345',
        organisationNumber: null,
      },
      appId: 'mockOrg/mockApp',
      created: new Date('2020-01-01'),
      data: [
        {
          id: '4f2610c9-911a-46a3-bc2d-5191602193f4',
          instanceGuid: '91cefc5e-c47b-40ff-a8a4-05971205f783',
          dataType: 'test-data-model',
          contentType: 'application/xml',
          blobStoragePath: 'ttd/frontend-test/91cefc5e-c47b-40ff-a8a4-05971205f783/data/4f2610c9-911a-46a3-bc2d-5191602193f4',
          size: 1017,
          locked: false,
          refs: [],
          isRead: true,
          created: new Date('2021-06-04T13:26:43.9100666Z'),
          createdBy: '12345',
          lastChanged: new Date('2021-06-04T13:30:48.4307222Z'),
          lastChangedBy: '12345',
        },
      ],
      id: '91cefc5e-c47b-40ff-a8a4-05971205f783',
      instanceState: null,
      lastChanged: new Date('2020-01-01'),
      org: 'mockOrg',
      process: {
        started: '2020-01-01',
        startEvent: null,
        currentTask: {
          flow: 1,
          started: '2020-01-01',
          elementId: 'mockElementId',
          name: 'Task_1',
          altinnTaskType: 'FormFilling',
          ended: null,
          validated: null,
        },
        ended: null,
        endEvent: null,
      },
      selfLinks: null,
      status: null,
      title: null,
    },
  };

  return {
    ...mockInstanceDataState,
    ...customStates,
  };
}
