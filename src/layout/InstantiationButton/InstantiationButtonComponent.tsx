import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import classes from 'src/layout/InstantiationButton/InstantiationButton.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export type IInstantiationButtonComponentReceivedProps = PropsFromGenericComponent<'InstantiationButton'>;
export type IInstantiationButtonComponentProvidedProps = IButtonProvidedProps;

export function InstantiationButtonComponent({ node, ...componentProps }: IInstantiationButtonComponentReceivedProps) {
  const props: IInstantiationButtonComponentProvidedProps = { ...componentProps, ...node.item, node };
  const { lang } = useLanguage();

  const parentIsPage = props.node.parent instanceof LayoutPage;
  return (
    <div
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      <InstantiationButton {...props}>{lang(node.item.textResourceBindings?.title)}</InstantiationButton>
    </div>
  );
}
