import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { PropsFromGenericComponent } from 'src/layout';

export function InstantiationButtonComponent({
  baseComponentId,
  ...componentProps
}: PropsFromGenericComponent<'InstantiationButton'>) {
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const parentIsPage = parent?.type === 'page';

  return (
    <InstantiationButton
      baseComponentId={baseComponentId}
      {...componentProps}
      addPageMargin={parentIsPage}
    />
  );
}
