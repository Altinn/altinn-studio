import type { IApplicationMetadata } from 'src/features/applicationMetadata';

export const getApplicationMetadataMock = (
  overrides: Partial<IApplicationMetadata> | ((application: IApplicationMetadata) => void) = {},
): IApplicationMetadata => {
  const out: IApplicationMetadata = {
    id: 'mockOrg/test-app',
    org: 'mockOrg',
    title: {
      nb: 'Test App',
    },
    autoDeleteOnProcessEnd: false,
    dataTypes: [
      {
        id: 'test-data-model',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Skjema',
        },
        taskId: 'Task_1',
        maxCount: 1,
        minCount: 1,
      },
      {
        id: 'ref-data-as-pdf',
        allowedContentTypes: ['application/pdf'],
        maxCount: 0,
        minCount: 0,
      },
      {
        id: 'test-data-type-1',
        allowedContentTypes: ['application/pdf'],
        maxCount: 5,
        minCount: 0,
      },
      {
        id: 'test-data-type-2',
        allowedContentTypes: ['application/pdf'],
        maxCount: 2,
        minCount: 0,
      },
      {
        id: 'stateless',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Skjema2',
        },
        taskId: 'Task_0',
        maxCount: 1,
        minCount: 1,
      },
      {
        id: 'stateless-anon',
        allowedContentTypes: ['application/xml'],
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Skjema3',
          allowAnonymousOnStateless: true,
        },
        taskId: 'Task_0',
        maxCount: 1,
        minCount: 1,
      },
    ],
    partyTypesAllowed: {
      bankruptcyEstate: false,
      organisation: false,
      person: true,
      subUnit: false,
    },
    created: '2020-06-29T08:47:12.425551Z',
    createdBy: 'test testesen',
    lastChanged: '2020-06-29T08:47:12.4255537Z',
    lastChangedBy: 'test testesen',
    ...overrides,
  };

  if (typeof overrides === 'function') {
    overrides(out);
  } else if (overrides && Object.keys(overrides).length > 0) {
    Object.assign(out, overrides);
  }

  return out;
};
