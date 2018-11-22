import { createSelector } from 'reselect';

const designModeSelector = (state: IAppState) => {
  return state.appData.appConfig.designMode;
};

const dataModelSelector = (state: IAppState) => {
  return state.appData.dataModel.model;
};

const getDesignMode = () => {
  return createSelector(
    [designModeSelector],
    (designMode: boolean) => {
      return designMode;
    },
  );
};

const getDataModel = () => {
  return createSelector(
    [dataModelSelector],
    (dataModel) => {
      return dataModel;
    },
  );
};

export const makeGetDesignModeSelector = getDesignMode;
export const makeGetDataModelSelector = getDataModel;
