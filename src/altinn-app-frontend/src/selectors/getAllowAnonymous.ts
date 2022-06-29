import type { IRuntimeState } from 'src/types';
import { createSelector } from 'reselect';
import {
  getDataTypeByLayoutSetId,
  isStatelessApp,
} from 'src/utils/appMetadata';

const getApplicationMetadata = (state: IRuntimeState) =>
  state.applicationMetadata?.applicationMetadata;
const getLayoutSets = (state: IRuntimeState) => state.formLayout.layoutsets;

const getAllowAnonymous = () => {
  return createSelector(
    [getApplicationMetadata, getLayoutSets],
    (application, layoutsets) => {
      // Require application metadata - return undefined if not yet loaded
      if (!application || !application.dataTypes) {
        return undefined;
      }

      if (!isStatelessApp(application)) return false;
      // Require layout sets for stateless apps - return undefined if not yet loaded
      if (!layoutsets?.sets) {
        return undefined;
      }

      const dataTypeId = getDataTypeByLayoutSetId(
        application.onEntry.show,
        layoutsets,
      );
      const dataType = application.dataTypes.find((d) => d.id === dataTypeId);
      if (dataType?.appLogic?.allowAnonymousOnStateless !== undefined) {
        return dataType.appLogic.allowAnonymousOnStateless;
      }

      return false;
    },
  );
};

export const makeGetAllowAnonymousSelector = getAllowAnonymous;
