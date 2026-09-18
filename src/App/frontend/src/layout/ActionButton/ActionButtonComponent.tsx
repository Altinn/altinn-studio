import React from 'react';

import { ActionButton } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export function ActionButtonComponent({ baseComponentId }: PropsFromGenericComponent<'ActionButton'>) {
  const config = useComponentConfig(baseComponentId, 'ActionButton');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.ActionButton.textResourceBindings.title,
  );

  const { innerGrid } = useComponentStructureData(baseComponentId);
  const { mutate: processNext, isPending: isPerformingProcessNext } = useProcessNext({ action: config.action });
  const isAuthorized = useIsAuthorized();

  if (useIsSubformPage()) {
    throw new Error('Cannot use process navigation in a subform');
  }

  return (
    <ActionButton
      componentId={componentId}
      title={title ?? `actions.${config.action}`}
      buttonStyle={config.buttonStyle}
      disabled={!isAuthorized(config.action)}
      isLoading={isPerformingProcessNext}
      onClick={() => processNext()}
      innerGrid={innerGrid}
    />
  );
}
