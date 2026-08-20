import React from 'react';

import { Loader } from 'src/core/loading/Loader';
import { FormStore } from 'src/features/form/FormContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { getComponentDef, implementsSubRouting } from 'src/layout';
import { RedirectBackToMainForm } from 'src/layout/Subform/SubformWrapper';

export default function ComponentRouting() {
  const componentId = useNavigationParam('componentId');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();

  // Wait for props to sync, needed for now
  if (!componentId) {
    return <Loader reason='component-routing' />;
  }

  const component = layoutLookups.allComponents[componentId];
  if (!component) {
    // Consider adding a 404 page?
    return <RedirectBackToMainForm />;
  }

  const def = getComponentDef(component.type);
  if (implementsSubRouting(def)) {
    const SubRouting = def.subRouting;

    return <SubRouting baseComponentId={componentId} />;
  }

  // If node exists but does not implement sub routing
  throw new Error(`Component ${componentId} does not have subRouting`);
}
