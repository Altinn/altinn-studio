import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { getFormDataStateMock } from 'src/__mocks__/getFormDataStateMock';
import { getFormLayoutStateMock } from 'src/__mocks__/getFormLayoutStateMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getOrgsMock } from 'src/__mocks__/getOrgsMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileStateMock } from 'src/__mocks__/getProfileMock';
import { getTextResourcesMock } from 'src/__mocks__/getTextResourcesMock';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import type { IRuntimeState } from 'src/types';

export function getInitialStateMock(custom?: Partial<IRuntimeState> | ((state: IRuntimeState) => void)): IRuntimeState {
  const initialState: IRuntimeState = {
    applicationMetadata: {
      applicationMetadata: getApplicationMetadataMock(),
    },
    customValidation: {
      customValidation: null,
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
      schemas: {},
    },
    formDynamics: {
      APIs: null,
      conditionalRendering: null,
      ruleConnection: null,
    },
    formLayout: getFormLayoutStateMock(),
    formRules: {
      model: [],
    },
    formValidations: {
      validations: {},
      invalidDataTypes: [],
    },
    footerLayout: {
      footerLayout: null,
    },
    organisationMetaData: {
      allOrgs: getOrgsMock(),
    },
    profile: getProfileStateMock(),
    textResources: {
      resourceMap: resourcesAsMap(getTextResourcesMock()),
    },
    applicationSettings: {
      applicationSettings: getApplicationSettingsMock(),
    },
    deprecated: {
      lastKnownProcess: getProcessDataMock(),
      lastKnownInstance: getInstanceDataMock(),
      currentLanguage: 'nb',
      anonymous: false,
    },
  };

  if (custom && typeof custom === 'function') {
    custom(initialState);
    return initialState;
  }

  return {
    ...initialState,
    ...custom,
  };
}
