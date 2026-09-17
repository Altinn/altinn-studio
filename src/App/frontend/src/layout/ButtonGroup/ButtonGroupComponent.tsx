import React from 'react';

import { ButtonGroupLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

export function ButtonGroupComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'ButtonGroup'>) {
  const config = useComponentConfig(baseComponentId, 'ButtonGroup');
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.ButtonGroup.textResourceBindings.title,
  );
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.ButtonGroup.textResourceBindings.description,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.ButtonGroup.textResourceBindings.help);

  const canRender = useHasCapability('renderInButtonGroup');
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  return (
    <ButtonGroupLayout
      id={componentId}
      componentId={componentId}
      title={showLabel ? (config.textResourceBindings?.title === undefined ? undefined : title) : undefined}
      description={config.textResourceBindings?.description === undefined ? undefined : description}
      help={config.textResourceBindings?.help === undefined ? undefined : help}
      grid={config.grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    >
      {config.children.map((childId) => (
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
