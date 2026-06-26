import React from 'react';

import { ButtonGroupLayout } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function ButtonGroupComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const { grid, children, textResourceBindings } = useItemWhenType(baseComponentId, 'ButtonGroup');
  const canRender = useHasCapability('renderInButtonGroup');
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  return (
    <ButtonGroupLayout
      componentId={componentId}
      title={showLabel ? textResourceBindings?.title : undefined}
      description={textResourceBindings?.description}
      help={textResourceBindings?.help}
      grid={grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    >
      {children.map((childId) => (
        <Child
          key={childId}
          baseId={childId}
          canRender={canRender}
        />
      ))}
    </ButtonGroupLayout>
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
