import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { Button, type ButtonColor, type ButtonVariant } from 'src/app-components/button/Button';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useActionAuthorization } from 'src/layout/CustomButton/CustomButtonComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ActionButtonStyle } from 'src/layout/ActionButton/config.generated';

export const buttonStyles: { [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type IActionButton = PropsFromGenericComponent<'ActionButton'>;

export function ActionButtonComponent({ node }: IActionButton) {
  const { busyWithId, busy, next } = useProcessNavigation() || {};
  const { isAuthorized } = useActionAuthorization();

  const { action, buttonStyle, id, textResourceBindings } = useNodeItem(node);
  const disabled = !isAuthorized(action);
  const isLoadingHere = busyWithId === id;

  function handleClick() {
    if (!disabled && !busy) {
      next && next({ action, nodeId: id });
    }
  }

  // FIXME: app crashes hard if buttonStyle is configured incorrectly
  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <ComponentStructureWrapper node={node}>
      <Button
        id={`action-button-${id}`}
        variant={variant}
        color={color}
        disabled={disabled || isLoadingHere || busy}
        isLoading={!!isLoadingHere}
        onClick={handleClick}
      >
        <Lang id={textResourceBindings?.title ?? `actions.${action}`} />
      </Button>
    </ComponentStructureWrapper>
  );
}
