// tslint:disable: max-line-length
import 'jest';
import { IData } from '../../src/types';
import { getInstancePdf, mapInstanceAttachments } from '../../src/utils/attachmentsUtils';

test('mapInstanceAttachments() returns correct attachment array', () => {
  const instance = {
    id: '50001/c1572504-9fb6-4829-9652-3ca9c82dabb9',
    instanceOwnerId: '50001',
    selfLinks: {
      apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9',
    },
    appId: 'matsgm/tjeneste-190814-1426',
    org: 'matsgm',
    createdDateTime: '2019-08-22T15:38:15.1437757Z',
    createdBy: '0',
    lastChangedDateTime: '2019-08-22T15:38:15.1440262Z',
    lastChangedBy: '0',
    process: {
      currentTask: 'Archived',
      isComplete: true,
    },
    instanceState: {
      isDeleted: false,
      isMarkedForHardDelete: false,
      isArchived: true,
    },
    data: [
      {
        id: '585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
        dataType: '585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
        filename: '585b2f4e-5ecb-417b-9d01-82b6e889e1d1.xml',
        contentType: 'application/Xml',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
        },
        size: 0,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:15.1480698Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:15.14807Z',
        lastChangedBy: '50001',
      },
      {
        id: '03e06136-88be-4866-a216-7959afe46137',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '4mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/03e06136-88be-4866-a216-7959afe46137',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/03e06136-88be-4866-a216-7959afe46137',
        },
        size: 4194304,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:27.4719761Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:27.4719776Z',
        lastChangedBy: '50001',
      },
      {
        id: '11943e38-9fc4-43f6-84c4-12e529eebd28',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '8mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/11943e38-9fc4-43f6-84c4-12e529eebd28',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/11943e38-9fc4-43f6-84c4-12e529eebd28',
        },
        size: 8388608,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:28.0099729Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:28.0099731Z',
        lastChangedBy: '50001',
      },
      {
        id: '092f032d-f54f-49c1-ae42-ebc0d10a2fcb',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '2mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/092f032d-f54f-49c1-ae42-ebc0d10a2fcb',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/092f032d-f54f-49c1-ae42-ebc0d10a2fcb',
        },
        size: 2097152,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:30.3266993Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:30.3266995Z',
        lastChangedBy: '50001',
      },
      {
        id: '8698103b-fad1-4665-85c6-bf88a75ad708',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '4mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/8698103b-fad1-4665-85c6-bf88a75ad708',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/8698103b-fad1-4665-85c6-bf88a75ad708',
        },
        size: 4194304,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:44.2017248Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:44.2017252Z',
        lastChangedBy: '50001',
      },
      {
        id: 'e950864d-e304-41ca-a60c-0c5019166df8',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '8mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/e950864d-e304-41ca-a60c-0c5019166df8',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/e950864d-e304-41ca-a60c-0c5019166df8',
        },
        size: 8388608,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:44.6846318Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:44.684632Z',
        lastChangedBy: '50001',
      },
      {
        id: '005d5bc3-a315-4705-9b06-3788fed86da1',
        dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
        filename: '2mb.txt',
        contentType: 'text/plain',
        storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/005d5bc3-a315-4705-9b06-3788fed86da1',
        selfLinks: {
          apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/005d5bc3-a315-4705-9b06-3788fed86da1',
        },
        size: 2097152,
        isLocked: false,
        createdDateTime: '2019-08-22T15:38:46.8968953Z',
        createdBy: '50001',
        lastChangedDateTime: '2019-08-22T15:38:46.8968955Z',
        lastChangedBy: '50001',
      },
    ],
  };

  const attachmentsTestData = [
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '4mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/03e06136-88be-4866-a216-7959afe46137',
    },
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '8mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/11943e38-9fc4-43f6-84c4-12e529eebd28',
    },
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '2mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/092f032d-f54f-49c1-ae42-ebc0d10a2fcb',
    },
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '4mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/8698103b-fad1-4665-85c6-bf88a75ad708',
    },
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '8mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/e950864d-e304-41ca-a60c-0c5019166df8',
    },
    {
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      iconClass: 'reg reg-attachment',
      name: '2mb.txt',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/005d5bc3-a315-4705-9b06-3788fed86da1',
    },
  ];

  expect(mapInstanceAttachments(instance.data as unknown as IData[], ['585b2f4e-5ecb-417b-9d01-82b6e889e1d1'])).toEqual(attachmentsTestData);
});

test('getInstancePdf() returns correct attachement', () => {
  const data = [
    {
      id: '585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
      dataType: 'ref-data-as-pdf',
      filename: 'kvittering.pdf',
      contentType: 'application/pdf',
      storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
      selfLinks: {
        apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
      },
      size: 0,
      isLocked: false,
      createdDateTime: '2019-08-22T15:38:15.1480698Z',
      createdBy: '50001',
      lastChangedDateTime: '2019-08-22T15:38:15.14807Z',
      lastChangedBy: '50001',
    },
    {
      id: '005d5bc3-a315-4705-9b06-3788fed86da1',
      dataType: 'cca36865-8f2e-4d29-8036-fa33bc4c3c34',
      filename: '2mb.txt',
      contentType: 'text/plain',
      storageUrl: 'tjeneste-190814-1426/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/005d5bc3-a315-4705-9b06-3788fed86da1',
      selfLinks: {
        apps: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/005d5bc3-a315-4705-9b06-3788fed86da1',
      },
      size: 2097152,
      isLocked: false,
      createdDateTime: '2019-08-22T15:38:46.8968953Z',
      createdBy: '50001',
      lastChangedDateTime: '2019-08-22T15:38:46.8968955Z',
      lastChangedBy: '50001',
    },
  ];

  const expectedResult = [
    {
      dataType: 'ref-data-as-pdf',
      iconClass: 'reg reg-attachment',
      name: 'kvittering.pdf',
      url: 'http://local.altinn.studio/matsgm/tjeneste-190814-1426/instances/50001/c1572504-9fb6-4829-9652-3ca9c82dabb9/data/585b2f4e-5ecb-417b-9d01-82b6e889e1d1',
    },
  ];

  expect(getInstancePdf(data as unknown as IData[])).toEqual(expectedResult);
});
