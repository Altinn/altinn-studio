import React from 'react';
import { useDispatch } from 'react-redux';

import { Button } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { ProcessActions } from 'src/features/process/processSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
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
  const dispatch = useDispatch();
  const busyWithId = useAppSelector((state) => state.process.completingId);
  const actionPermissions = useAppSelector((state) => state.process.actions);
  const { lang } = useLanguage();

  const { action, buttonStyle, id, textResourceBindings } = node.item;
  const disabled = !actionPermissions?.[action];

  function handleClick() {
    if (!disabled && !busyWithId) {
      dispatch(
        ProcessActions.complete({
          componentId: id,
          action,
        }),
      );
    }
  }

  const isLoading = busyWithId === id;
  const parentIsPage = node.parent instanceof LayoutPage;
  const buttonText = lang(textResourceBindings?.title ?? `actions.${action}`);
  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <ButtonLoader
      isLoading={isLoading}
      style={{
        marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined,
      }}
    >
      <Button
        size='small'
        id={`action-button-${id}`}
        variant={variant}
        color={color}
        disabled={disabled || isLoading}
        onClick={handleClick}
      >
        {buttonText}
      </Button>
    </ButtonLoader>
  );
}
