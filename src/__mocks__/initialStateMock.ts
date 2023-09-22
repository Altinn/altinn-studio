import { applicationMetadataMock } from 'src/__mocks__/applicationMetadataMock';
import { applicationSettingsMock } from 'src/__mocks__/applicationSettingsMock';
import { getFormDataStateMock } from 'src/__mocks__/formDataStateMock';
import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInstanceDataStateMock } from 'src/__mocks__/instanceDataStateMock';
import { partyMock } from 'src/__mocks__/partyMock';
import { getProcessStateMock } from 'src/__mocks__/processMock';
import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { DevToolsTab } from 'src/features/devtools/data/types';
import type { IRuntimeState } from 'src/types';

export function getInitialStateMock(customStates?: Partial<IRuntimeState>): IRuntimeState {
  const initialState: IRuntimeState = {
    applicationMetadata: {
      applicationMetadata: applicationMetadataMock,
      error: null,
    },
    attachments: {
      attachments: {},
    },
    devTools: {
      activeTab: DevToolsTab.General,
      isOpen: false,
      pdfPreview: false,
      hiddenComponents: 'hide',
      layoutInspector: {
        selectedComponentId: undefined,
      },
      nodeInspector: {
        selectedNodeId: undefined,
      },
      exprPlayground: {
        expression: undefined,
        forPage: undefined,
        forComponentId: undefined,
      },
      logs: [],
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
    footerLayout: {
      footerLayout: null,
      error: null,
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
    organisationMetaData: {
      allOrgs: {
        mockOrg: {
          name: {
            en: 'Mock Ministry',
            nb: 'Mockdepartementet',
            nn: 'Mockdepartementet',
          },
          logo: 'https://altinncdn.no/orgs/mockOrg/mockOrg.png',
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
    pdf: {
      readyForPrint: false,
      pdfFormat: null,
      method: null,
      error: null,
    },
    process: getProcessStateMock(),
    profile: getProfileStateMock(),
    queue: {
      appTask: { error: null, isDone: null },
      dataTask: { error: null, isDone: null },
      infoTask: { error: null, isDone: null },
      stateless: { error: null, isDone: null },
      userTask: { error: null, isDone: null },
    },
    textResources: {
      resourceMap: {
        'option.from.rep.group.label': {
          value: 'The value from the group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'someGroup[{0}].labelField',
            },
          ],
        },
        'option.from.rep.group.description': {
          value: 'Description: The value from the group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'someGroup[{0}].labelField',
            },
          ],
        },
        'option.from.rep.group.helpText': {
          value: 'Help Text: The value from the group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'someGroup[{0}].labelField',
            },
          ],
        },
        'group.input.title': {
          value: 'The value from group is: {0}',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'referencedGroup[{0}].inputField',
            },
          ],
        },
        'group.input.title-2': {
          value: 'The value from the group is: Value from input field [2]',
          variables: [
            {
              dataSource: 'dataModel.skjema',
              key: 'referencedGroup[2].inputField',
            },
          ],
        },
        'accordion.title': {
          value: 'This is a title',
        },
      },
      error: null,
      language: 'nb',
    },
    optionState: {
      options: {},
      error: null,
      loading: false,
    },
    dataListState: {
      dataLists: {},
      error: null,
      dataListCount: 0,
      dataListLoadedCount: 0,
      loading: false,
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
