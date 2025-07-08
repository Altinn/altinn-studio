import React from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import classes from 'src/layout/InstantiationButton/InstantiationButton.module.css';
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
  const parent = useLayoutLookups().componentToParent[baseComponentId];

  const parentIsPage = parent?.type === 'page';
  return (
    <div
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <InstantiationButton {...props}>
          <Lang id={item.textResourceBindings?.title} />
        </InstantiationButton>
      </ComponentStructureWrapper>
    </div>
  );
}
