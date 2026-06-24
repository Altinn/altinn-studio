import React from 'react';

import { ButtonGroupLayout } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function ButtonGroupComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const { grid, children, textResourceBindings } = useItemWhenType(baseComponentId, 'ButtonGroup');
  const canRender = useHasCapability('renderInButtonGroup');

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <ButtonGroupLayout
        id={baseComponentId}
        title={showLabel ? textResourceBindings?.title : undefined}
        description={textResourceBindings?.description}
        help={textResourceBindings?.help}
        grid={grid?.labelGrid}
      >
        {children.map((childId) => (
          <Child
            key={childId}
            baseId={childId}
            canRender={canRender}
          />
        ))}
      </ButtonGroupLayout>
    </ComponentStructureWrapper>
  );
}

function Child({ baseId, canRender }: { baseId: string; canRender: (id: string) => boolean }) {
  const id = useIndexedId(baseId);

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
