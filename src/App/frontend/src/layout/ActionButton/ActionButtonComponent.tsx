import React from 'react';

import { ActionButton } from '@app/form-component';

import type { PropsFromGenericComponent } from '..';

import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function ActionButtonComponent({ baseComponentId }: PropsFromGenericComponent<'ActionButton'>) {
  const { action, buttonStyle, id, textResourceBindings } = useItemWhenType(baseComponentId, 'ActionButton');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const { mutate: processNext, isPending: isPerformingProcessNext } = useProcessNext({ action });
  const isAuthorized = useIsAuthorized();

  if (useIsSubformPage()) {
    throw new Error('Cannot use process navigation in a subform');
  }

  return (
    <ActionButton
      componentId={componentId}
      id={`action-button-${id}`}
      title={textResourceBindings?.title ?? `actions.${action}`}
      buttonStyle={buttonStyle}
      disabled={!isAuthorized(action)}
      isLoading={isPerformingProcessNext}
      onClick={() => processNext()}
      innerGrid={innerGrid}
    />
  );
}
