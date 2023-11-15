import React from 'react';

import { Button } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { useLanguage } from 'src/hooks/useLanguage';
import { ButtonLoader } from 'src/layout/Button/ButtonLoader';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ActionButtonStyle } from 'src/layout/ActionButton/config.generated';
import type { ButtonColor, ButtonVariant } from 'src/layout/Button/WrappedButton';

export const buttonStyles: { [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type IActionButton = PropsFromGenericComponent<'ActionButton'>;

export function ActionButtonComponent({ node }: IActionButton) {
  const { busyWithId, busy, next } = useProcessNavigation() || {};
  const actionPermissions = useLaxProcessData()?.currentTask?.actions;
  const { lang } = useLanguage();

  const { action, buttonStyle, id, textResourceBindings } = node.item;
  const disabled = !actionPermissions?.[action];
  const isLoadingHere = busyWithId === id;

  function handleClick() {
    if (!disabled && !busy) {
      next && next({ action, nodeId: id });
    }
  }

  const parentIsPage = node.parent instanceof LayoutPage;
  const buttonText = lang(textResourceBindings?.title ?? `actions.${action}`);
  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <ButtonLoader
      isLoading={isLoadingHere}
      style={{
        marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined,
      }}
    >
      <Button
        size='small'
        id={`action-button-${id}`}
        variant={variant}
        color={color}
        disabled={disabled || isLoadingHere || busy}
        onClick={handleClick}
      >
        {buttonText}
      </Button>
    </ButtonLoader>
  );
}
