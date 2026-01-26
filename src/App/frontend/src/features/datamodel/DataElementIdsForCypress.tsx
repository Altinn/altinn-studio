import { useEffect } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';

export function UpdateDataElementIdsForCypress() {
  const dataElementIds = DataModels.useDataElementIds();

  useEffect(() => {
    if (globalThis.Cypress) {
      globalThis.CypressState = { ...globalThis.CypressState, dataElementIds };
    }
  }, [dataElementIds]);

  return null;
}
