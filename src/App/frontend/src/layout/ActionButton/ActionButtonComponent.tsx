import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { Button, type ButtonColor, type ButtonVariant } from 'src/app-components/Button/Button';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useIsSubformPage } from 'src/hooks/navigation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ActionButtonStyle } from 'src/layout/ActionButton/config.generated';

export const buttonStyles: { [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type IActionButton = PropsFromGenericComponent<'ActionButton'>;

export function ActionButtonComponent({ baseComponentId }: IActionButton) {
  const { action, buttonStyle, id, textResourceBindings } = useItemWhenType(baseComponentId, 'ActionButton');
  const { mutate: processNext, isPending: isPerformingProcessNext } = useProcessNext({ action });
  const isAuthorized = useIsAuthorized();

  if (useIsSubformPage()) {
    throw new Error('Cannot use process navigation in a subform');
  }

  // FIXME: app crashes hard if buttonStyle is configured incorrectly
  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Button
        id={`action-button-${id}`}
        variant={variant}
        color={color}
        disabled={!isAuthorized(action)}
        isLoading={isPerformingProcessNext}
        onClick={() => processNext()}
      >
        <Lang id={textResourceBindings?.title ?? `actions.${action}`} />
      </Button>
    </ComponentStructureWrapper>
  );
}
