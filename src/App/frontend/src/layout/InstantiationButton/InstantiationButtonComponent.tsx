import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export type IInstantiationButtonComponentProvidedProps = IButtonProvidedProps;

export function InstantiationButtonComponent({
  baseComponentId,
  ...componentProps
}: PropsFromGenericComponent<'InstantiationButton'>) {
  const item = useItemWhenType(baseComponentId, 'InstantiationButton');
  const props: IInstantiationButtonComponentProvidedProps = { ...componentProps, ...item, baseComponentId };
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const parentIsPage = parent?.type === 'page';

  return (
    <InstantiationButton
      {...props}
      addPageMargin={parentIsPage}
    />
  );
}
