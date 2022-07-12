import { getLanguageFromCode } from '../../shared/src/language';
import type { IRuntimeState } from '../src/types';
import { getFormLayoutStateMock } from './formLayoutStateMock';
import { getFormDataStateMock } from './formDataStateMock';
import { applicationMetadataMock } from './applicationMetadataMock';
import { applicationSettingsMock } from './applicationSettingsMock';
import type { IParty } from '../../shared/src';
import { getInstanceDataStateMock } from './instanceDataStateMock';
import { getProfileStateMock } from './profileStateMock';

export const mockParty: IParty = {
  partyId: '12345',
  name: 'Ola Privatperson',
  ssn: '01017512345',
  partyTypeName: null,
  orgNumber: null,
  unitType: null,
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  childParties: null,
};

export function getInitialStateMock(
  customStates?: Partial<IRuntimeState>,
): IRuntimeState {
  const initialState: IRuntimeState = {
    applicationMetadata: {
      applicationMetadata: applicationMetadataMock,
      error: null,
    },
    attachments: {
      attachments: null,
    },
    formData: getFormDataStateMock(),
    formDataModel: {
      error: null,
      schemas: null,
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
      model: null,
    },
    formValidations: {
      validations: {},
      error: null,
      invalidDataTypes: [],
      currentSingleFieldValidation: null,
    },
    instanceData: getInstanceDataStateMock(),
    instantiation: {
      error: null,
      instanceId: null,
      instantiating: null,
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
      parties: [mockParty],
      selectedParty: mockParty,
    },
    process: {
      error: null,
      taskType: null,
      taskId: null,
    },
    profile: getProfileStateMock(),
    queue: {
      appTask: null,
      dataTask: null,
      infoTask: null,
      stateless: null,
      userTask: null,
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
    applicationSettings: {
      applicationSettings: applicationSettingsMock,
      error: null,
    },
  };

  return {
    ...initialState,
    ...customStates,
  };
}
