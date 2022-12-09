import { getLanguageFromCode } from 'src/language/languages';
import type { IRuntimeState } from 'src/types';
import { getFormLayoutStateMock } from './formLayoutStateMock';
import { getFormDataStateMock } from './formDataStateMock';
import { applicationMetadataMock } from './applicationMetadataMock';
import { applicationSettingsMock } from './applicationSettingsMock';
import { getInstanceDataStateMock } from './instanceDataStateMock';
import { partyMock } from './partyMock';
import { getProfileStateMock } from './profileStateMock';

export function getInitialStateMock(customStates?: Partial<IRuntimeState>): IRuntimeState {
  const initialState: IRuntimeState = {
    applicationMetadata: {
      applicationMetadata: applicationMetadataMock,
      error: null,
    },
    attachments: {
      attachments: {},
    },
    formData: getFormDataStateMock(),
    formDataModel: {
      error: null,
      schemas: {},
    },
    formDynamics: {
      apis: null,
      conditionalRendering: null,
      error: null,
      ruleConnection: null,
    },
    formLayout: getFormLayoutStateMock(),
    formRules: {
      error: null,
      fetched: false,
      fetching: false,
      model: [],
    },
    formValidations: {
      validations: {},
      error: null,
      invalidDataTypes: [],
    },
    instanceData: getInstanceDataStateMock(),
    instantiation: {
      error: null,
      instanceId: null,
      instantiating: false,
    },
    isLoading: {
      dataTask: false,
      stateless: null,
    },
    language: {
      language: getLanguageFromCode('nb'),
      selectedAppLanguage: '',
      error: null,
    },
    organisationMetaData: {
      allOrgs: {
        mockOrg: {
          name: {
            en: 'Mock Ministry',
            nb: 'Mockdepartementet',
            nn: 'Mockdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
          environments: ['tt02', 'production'],
        },
      },
      error: null,
    },
    party: {
      error: null,
      parties: [partyMock],
      selectedParty: partyMock,
    },
    process: {
      error: null,
      taskType: null,
      taskId: null,
    },
    profile: getProfileStateMock(),
    queue: {
      appTask: { error: null, isDone: null },
      dataTask: { error: null, isDone: null },
      infoTask: { error: null, isDone: null },
      stateless: { error: null, isDone: null },
      userTask: { error: null, isDone: null },
    },
    textResources: {
      resources: [
        {
          id: 'option.from.rep.group.label',
          value: 'The value from the group is: {0}',
          unparsedValue: 'The value from the group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'someGroup[{0}].labelField',
            },
          ],
        },
        {
          id: 'group.input.title',
          value: 'The value from group is: {0}',
          unparsedValue: 'The value from group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'referencedGroup[{0}].inputField',
            },
          ],
        },
        {
          id: 'group.input.title-2',
          value: 'The value from the group is: Value from input field [2]',
          unparsedValue: 'The value from group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'referencedGroup[2].inputField',
            },
          ],
        },
      ],
      error: null,
      language: 'nb',
    },
    optionState: {
      options: {},
      error: null,
    },
    dataListState: {
      dataLists: {},
      error: null,
    },
    applicationSettings: {
      applicationSettings: applicationSettingsMock,
      error: null,
    },
    appApi: {} as IRuntimeState['appApi'],
  };

  return {
    ...initialState,
    ...customStates,
  };
}
