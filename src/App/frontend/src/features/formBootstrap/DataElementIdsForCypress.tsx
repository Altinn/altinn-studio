import { useEffect } from 'react';

import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';

export function UpdateDataElementIdsForCypress() {
  const dataElementIds = FormBootstrap.useDataElementIds();

  useEffect(() => {
    if (window.Cypress) {
      window.CypressState = { ...window.CypressState, dataElementIds };
    }
  }, [dataElementIds]);

  return null;
}
