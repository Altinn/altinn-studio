import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import classes from 'src/layout/InstantiationButton/InstantiationButton.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export type IInstantiationButtonComponentReceivedProps = PropsFromGenericComponent<'InstantiationButton'>;
export type IInstantiationButtonComponentProvidedProps = IButtonProvidedProps;

export function InstantiationButtonComponent({ node, ...componentProps }: IInstantiationButtonComponentReceivedProps) {
  const item = useItemWhenType(node.baseId, 'InstantiationButton');
  const props: IInstantiationButtonComponentProvidedProps = { ...componentProps, ...item, node };

  const parentIsPage = props.node.parent instanceof LayoutPage;
  return (
    <div
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      <ComponentStructureWrapper node={props.node}>
        <InstantiationButton {...props}>
          <Lang id={item.textResourceBindings?.title} />
        </InstantiationButton>
      </ComponentStructureWrapper>
    </div>
  );
}
