import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const bp = `${window.location.origin}/designer`;
const basePath = `${window.location.origin}/designer/${org}/${app}`;
const cdnPath = 'https://altinncdn.no/schemas/json/layout';

export const getAddApplicationMetadataUrl = (): string => `${basePath}/UIEditor/AddMetadataForAttachment`;
export const getAddTextResourcesUrl = (): string => `${basePath}/UIEditor/AddTextResources`;
export const getDeleteApplicationMetadataUrl = (): string => `${basePath}/UIEditor/DeleteMetadataForAttachment?id=`;
export const getDeleteForLayoutUrl = (layout: string): string => `${basePath}/UIEditor/DeleteFormLayout/${layout}`;
export const getFetchDataModelUrl = () => `${basePath}/Model/GetJson`;
export const getFetchFormLayoutUrl = (): string => `${basePath}/UIEditor/GetFormLayout`;
export const getFetchLanguageUrl = (languageCode: string) => `${bp}/frontend/lang/${languageCode}.json`;
export const getFetchRuleConfigurationUrl = () => `${basePath}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`;
export const getFetchRuleModelUrl = () => `${basePath}/UIEditor/GetRuleHandler`;
export const getLayoutSchemaUrl = (): string => `${cdnPath}/layout.schema.v1.json`;
export const getLayoutSettingsSchemaUrl = () => `${cdnPath}/layoutSettings.schema.v1.json`;
export const getLayoutSettingsUrl = (): string => `${basePath}/UIEditor/GetLayoutSettings`;
export const getSaveFormLayoutUrl = (layoutName: string): string => `${basePath}/UIEditor/SaveFormLayout/${layoutName}`;
export const getSaveLayoutSettingsUrl = (): string => `${basePath}/UIEditor/SaveLayoutSettings`;
export const getSveSerConfUrl = (): string => `${basePath}/UIEditor/SaveJsonFile?fileName=RuleConfiguration.json`;
export const getTextResourcesUrl = (languageCode: string) => `${basePath}/UIEditor/GetTextResources/${languageCode}`;
export const getUpLayNmeUrl = (layoutName: string) => `${basePath}/UIEditor/UpdateFormLayoutName/${layoutName}`;
export const getUpdateApplicationMetadataUrl = (): string => `${basePath}/UIEditor/UpdateMetadataForAttachment`;
export const getWidgetsSettingsUrl = (): string => `${basePath}/UIEditor/GetWidgetSettings`;
