import React from 'react';

import { Grid } from '@material-ui/core';

import type { PropsFromGenericComponent } from '..';

import classes from 'src/layout/ButtonGroup/ButtonGroupComponent.module.css';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';

export function ButtonGroupComponent({ node }: PropsFromGenericComponent<'ButtonGroup'>) {
  const childComponents = useNodeItem(node, (i) => i.childComponents);
  return (
    <ComponentStructureWrapper
      node={node}
      label={{ node, renderLabelAs: 'legend' }}
    >
      <Grid
        item
        container
        alignItems='center'
        className={classes.container}
      >
        {childComponents.map((n) => (
          <div
            key={n.id}
            data-componentid={n.id}
            data-componentbaseid={n.baseId}
          >
            <GenericComponent
              node={n}
              overrideDisplay={{ directRender: true }}
            />
          </div>
        ))}
      </Grid>
    </ComponentStructureWrapper>
  );
}
