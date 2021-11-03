const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
const basePath = `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}`;

export const getFetchFormLayoutUrl = (): string => {
  return `${basePath}/UIEditor/GetFormLayout`;
};

export const getSaveFormLayoutUrl = (layoutName: string): string => {
  return `${basePath}/UIEditor/SaveFormLayout/${layoutName}`;
};

export const getUpdateFormLayoutNameUrl = (layoutName: string): string => {
  return `${basePath}/UIEditor/UpdateFormLayoutName/${layoutName}`;
};

export const getDeleteForLayoutUrl = (layout: string): string => {
  return `${basePath}/UIEditor/DeleteFormLayout/${layout}`;
};

export const getLayoutSettingsUrl = (): string => {
  return `${basePath}/UIEditor/GetLayoutSettings`;
};

export const getSaveLayoutSettingsUrl = (): string => {
  return `${basePath}/UIEditor/SaveLayoutSettings`;
};

export const getSaveServiceConfigurationUrl = (): string => {
  return `${basePath}/UIEditor/SaveJsonFile?fileName=RuleConfiguration.json`;
};

export const getAddApplicationMetadataUrl = (): string => {
  return `${basePath}/UIEditor/AddMetadataForAttachment`;
};

export const getDeleteApplicationMetadataUrl = (): string => {
  return `${basePath}/UIEditor/DeleteMetadataForAttachment?id=`;
};

export const getUpdateApplicationMetadataUrl = (): string => {
  return `${basePath}/UIEditor/UpdateMetadataForAttachment`;
};

export const getLayoutSettingsSchemaUrl = (): string => {
  return 'https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json';
};

export const getLayoutSchemaUrl = (): string => {
  return 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json';
};

export const getAddTextResourcesUrl = (): string => {
  return `${basePath}/UIEditor/AddTextResources`;
};

export const getWidgetsSettingsUrl = (): string => {
  return `${basePath}/UIEditor/GetWidgetSettings`;
};

export const getLoadTextResourcesUrl = (languageCode: string) => {
  return `${basePath}/UIEditor/GetTextResources/${languageCode}`;
};

export const getFetchDataModelUrl = () => {
  return `${basePath}/Model/GetJson`;
};

export const getFetchLanguageUrl = (languageCode: string) => {
  return `${window.location.origin}/designerapi/Language/GetLanguageAsJSON?languageCode=${languageCode}`;
};

export const getFetchRuleModelUrl = () => {
  return `${basePath}/UIEditor/GetRuleHandler`;
};

export const getFetchRuleConfigurationUrl = () => {
  return `${basePath}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`
};
