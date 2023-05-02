import React from 'react';

import { Grid } from '@material-ui/core';

import type { PropsFromGenericComponent } from '..';

import classes from 'src/layout/ButtonGroup/ButtonGroupComponent.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function ButtonGroupComponent(props: PropsFromGenericComponent<'ButtonGroup'>) {
  const childNodes = props.node.item.childComponents;
  return (
    <Grid
      item
      container
      className={classes.container}
    >
      {childNodes.map((n: LayoutNode) => (
        <div
          key={n.item.id}
          data-componentid={n.item.baseComponentId ?? n.item.id}
        >
          <GenericComponent
            node={n}
            overrideDisplay={{ directRender: true }}
          />
        </div>
      ))}
    </Grid>
  );
}
