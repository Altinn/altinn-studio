import type { IInstance, IParty } from 'src/types/shared';

export const defaultMockDataElementId = '4f2610c9-911a-46a3-bc2d-5191602193f4';

export function getInstanceDataMock(
  mutate?: (data: IInstance) => void,
  partyId: number = 12345,
  ssn: string | undefined = '01017512345',
  orgNr?: string | null,
  party: IParty | undefined = undefined,
): IInstance {
  const partyIdStr = partyId.toString();

  const out: IInstance = {
    instanceOwner: {
      partyId: partyIdStr,
      party,
      personNumber: ssn,
      organisationNumber: orgNr,
    },
    appId: 'mockOrg/mockApp',
    created: new Date('2020-01-01').toISOString(),
    data: [
      {
        id: defaultMockDataElementId,
        instanceGuid: '91cefc5e-c47b-40ff-a8a4-05971205f783',
        dataType: 'test-data-model',
        contentType: 'application/xml',
        blobStoragePath:
          'ttd/frontend-test/91cefc5e-c47b-40ff-a8a4-05971205f783/data/4f2610c9-911a-46a3-bc2d-5191602193f4',
        size: 1017,
        locked: false,
        refs: [],
        isRead: true,
        created: new Date('2021-06-04T13:26:43.9100666Z').toISOString(),
        createdBy: partyIdStr,
        lastChanged: new Date('2021-06-04T13:30:48.4307222Z').toISOString(),
        lastChangedBy: partyIdStr,
      },
      {
        id: '917e7e06-2665-4307-8c05-b0accd8964c6',
        instanceGuid: 'b174e1f8-135c-4419-bd1c-fd171a0af1fe',
        dataType: 'ref-data-as-pdf',
        filename: 'mockApp.pdf',
        contentType: 'application/pdf',
        blobStoragePath:
          'mockOrg/mockApp/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6',
        selfLinks: {
          apps: 'https://local.altinn.cloud/mockOrg/mockApp/instances/501337/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6',
          platform:
            'https://platform.local.altinn.cloud/storage/api/v1/instances/501337/b174e1f8-135c-4419-bd1c-fd171a0af1fe/data/917e7e06-2665-4307-8c05-b0accd8964c6',
        },
        size: 3537,
        locked: false,
        refs: [],
        isRead: true,
        tags: [],
        created: new Date('2022-02-22T14:07:07.490511Z').toISOString(),
        createdBy: partyIdStr,
        lastChanged: new Date('2022-02-22T14:07:07.490511Z').toISOString(),
        lastChangedBy: partyIdStr,
      },
    ],
    id: `${partyId}/91cefc5e-c47b-40ff-a8a4-05971205f783`,
    instanceState: undefined,
    lastChanged: new Date('2020-01-01').toISOString(),
    org: 'mockOrg',
    selfLinks: null,
    status: null,
    title: null,
  };

  if (mutate) {
    mutate(out);
  }
  return out;
}
