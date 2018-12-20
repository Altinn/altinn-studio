export const getSaveFormLayoutUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/SaveFormLayout`;
};

export const getSaveServiceConfigurationUrl = (): string => {
  const altinnWindow: IAltinnWindow = window as IAltinnWindow;
  /* tslint:disable-next-line:max-line-length */
  return `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.service}/UIEditor/SaveJsonFile?fileName=ServiceConfigurations.json`;
};
