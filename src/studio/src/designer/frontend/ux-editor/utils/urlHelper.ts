export const getSaveFormLayoutUrl = (layoutName: string): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/SaveFormLayout/${layoutName}`;
};

export const getUpdateFormLayoutNameUrl = (layoutName: string): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/UpdateFormLayoutName/${layoutName}`;
};

export const getDeleteForLayoutUrl = (layout: string): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/DeleteFormLayout/${layout}`;
};

export const getLayoutSettingsUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/GetLayoutSettings`;
};

export const getSaveLayoutSettingsUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/SaveLayoutSettings`;
};

export const getSaveServiceConfigurationUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/SaveJsonFile?fileName=RuleConfiguration.json`;
};

export const getAddApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/AddMetadataForAttachment`;
};

export const getDeleteApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/DeleteMetadataForAttachment?id=`;
};

export const getUpdateApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}/UIEditor/UpdateMetadataForAttachment`;
};

export const getLayoutSettingsSchemaUrl = (): string => {
  return 'https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json';
};

export const getLayoutSchemaUrl = (): string => {
  return 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json';
};
