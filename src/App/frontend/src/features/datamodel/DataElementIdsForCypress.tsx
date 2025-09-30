import { useEffect } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';

export function UpdateDataElementIdsForCypress() {
  const dataElementIds = DataModels.useDataElementIds();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, dataElementIds };
    }
  }, [dataElementIds]);

  return null;
}
