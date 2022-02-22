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
        {
          id: '917e7e06-2665-4307-8c05-b0accd8964c6',
          instanceGuid: 'b174e1f8-135c-4419-bd1c-fd171a0af1fe',
          dataType: 'ref-data-as-pdf',
          filename: 'mockApp.pdf',
          contentType: 'application/pdf',
          blobStoragePath: 'mockOrg/mockApp/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6',
          selfLinks: {
            apps: 'https://altinn3local.no/mockOrg/mockApp/instances/501337/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6',
            platform: 'https://platform.altinn3local.no/storage/api/v1/instances/501337/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6'
          },
          size: 3537,
          locked: false,
          refs: [],
          isRead: true,
          tags: [],
          created: new Date('2022-02-22T14:07:07.490511Z'),
          createdBy: '12345',
          lastChanged: new Date('2022-02-22T14:07:07.490511Z'),
          lastChangedBy: '12345'
        }
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
