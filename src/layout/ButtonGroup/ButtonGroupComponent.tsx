import React from 'react';

import { Grid } from '@material-ui/core';

import type { PropsFromGenericComponent } from '..';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import classes from 'src/layout/ButtonGroup/ButtonGroupComponent.module.css';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';

export function ButtonGroupComponent({ node, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const { grid, childComponents } = useNodeItem(node);

  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({ node, overrideDisplay });

  return (
    <Fieldset
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ComponentStructureWrapper node={node}>
        <Grid
          item
          container
          alignItems='center'
          className={classes.container}
        >
          {childComponents.map((id) => (
            <Child
              key={id}
              id={id}
            />
          ))}
        </Grid>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}

function Child({ id }: { id: string }) {
  const node = useNode(id);
  if (!node) {
    return null;
  }

  return (
    <div
      key={node.id}
      data-componentid={node.id}
      data-componentbaseid={node.baseId}
    >
      <GenericComponent
        node={node}
        overrideDisplay={{ directRender: true }}
      />
    </div>
  );
}
