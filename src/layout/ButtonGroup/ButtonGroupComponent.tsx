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
import { useLabel } from 'src/utils/layout/useLabel';

export function ButtonGroupComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const { grid, children } = useExternalItem(baseComponentId, 'ButtonGroup');
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId,
    overrideDisplay,
  });

  return (
    <Fieldset
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
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
  const canRender = useHasCapability('renderInButtonGroup');
  if (!canRender(baseId)) {
    return null;
  }

  return (
    <div
      data-componentid={id}
      data-componentbaseid={baseId}
    >
      <GenericComponent
        baseComponentId={baseId}
        overrideDisplay={{ directRender: true }}
      />
    </div>
  );
}
