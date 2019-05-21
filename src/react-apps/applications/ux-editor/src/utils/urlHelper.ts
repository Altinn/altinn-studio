export const getSaveFormLayoutUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/SaveFormLayout`;
};

export const getSaveServiceConfigurationUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/SaveJsonFile?fileName=ServiceConfigurations.json`;
};

export const getAddApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/AddMetadataForAttachment`;
};

export const getDeleteApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/DeleteMetadataForAttachment?id=`;
};

export const getUpdateApplicationMetadataUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/UpdateMetadataForAttachment`;
};
