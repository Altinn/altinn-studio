import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { Flex } from 'src/app-components/Flex/Flex';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import classes from 'src/layout/ButtonGroup/ButtonGroupComponent.module.css';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useNode } from 'src/utils/layout/NodesContext';
import { useLabel } from 'src/utils/layout/useLabel';

export function ButtonGroupComponent({ node, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const { grid, children } = useExternalItem(node.baseId, 'ButtonGroup');
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId: node.baseId,
    overrideDisplay,
  });

  return (
    <Fieldset
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ComponentStructureWrapper node={node}>
        <Flex
          item
          container
          alignItems='center'
          className={classes.container}
        >
          {children.map((id) => (
            <Child
              key={id}
              baseId={id}
            />
          ))}
        </Flex>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}

function Child({ baseId }: { baseId: string }) {
  const id = useIndexedId(baseId);
  const node = useNode(id);
  const canRender = useHasCapability('renderInButtonGroup');
  if (!node || !canRender(baseId)) {
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
