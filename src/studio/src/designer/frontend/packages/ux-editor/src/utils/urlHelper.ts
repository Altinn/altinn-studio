import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const basePath = `${window.location.origin}/designer/${org}/${app}`;

export const getAddApplicationMetadataUrl = (): string => `${basePath}/UIEditor/AddMetadataForAttachment`;
export const getAddTextResourcesUrl = (): string => `${basePath}/UIEditor/AddTextResources`;
export const getDeleteApplicationMetadataUrl = (): string => `${basePath}/UIEditor/DeleteMetadataForAttachment?id=`;
export const getDeleteForLayoutUrl = (layout: string): string => `${basePath}/UIEditor/DeleteFormLayout/${layout}`;
export const getFetchDataModelUrl = () => `${basePath}/Model/GetJson`;
export const getFetchFormLayoutUrl = (): string => `${basePath}/UIEditor/GetFormLayout`;
export const getFetchRuleConfigurationUrl = () => `${basePath}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`;
export const getFetchRuleModelUrl = () => `${basePath}/UIEditor/GetRuleHandler`;
export const getLayoutSettingsUrl = (): string => `${basePath}/UIEditor/GetLayoutSettings`;
export const getSaveFormLayoutUrl = (layoutName: string): string => `${basePath}/UIEditor/SaveFormLayout/${layoutName}`;
export const getSaveLayoutSettingsUrl = (): string => `${basePath}/UIEditor/SaveLayoutSettings`;
export const getSveSerConfUrl = (): string => `${basePath}/UIEditor/SaveJsonFile?fileName=RuleConfiguration.json`;
export const getUpLayNmeUrl = (layoutName: string) => `${basePath}/UIEditor/UpdateFormLayoutName/${layoutName}`;
export const getUpdateApplicationMetadataUrl = (): string => `${basePath}/UIEditor/UpdateMetadataForAttachment`;
export const getWidgetsSettingsUrl = (): string => `${basePath}/UIEditor/GetWidgetSettings`;
