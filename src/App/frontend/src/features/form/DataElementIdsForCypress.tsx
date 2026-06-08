import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';

export function UpdateDataElementIdsForCypress() {
  const dataElementIds = FormStore.bootstrap.useDataElementIds();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, dataElementIds };
    }
  }, [dataElementIds]);

  return null;
}
