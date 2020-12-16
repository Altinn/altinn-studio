import { IInstanceDataState } from '../src/shared/resources/instanceData/instanceDataReducers';

export function getInstanceDataStateMock(customStates?: Partial<IInstanceDataState>): IInstanceDataState {
  const mockInstanceDataState = {
    error: null,
    instance: {
      instanceOwner: {
        partyId: '12345',
        personNumber: '01017512345',
        organisationNumber: null,
      },
      appId: 'mockOrg/mockApp',
      created: new Date('2020-01-01'),
      data: [],
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
