import React from 'react';
import { useDispatch } from 'react-redux';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { ProcessActions } from 'src/features/process/processSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/ActionButton/ActionButtonComponent.module.css';
import type { ActionButtonStyle } from 'src/layout/ActionButton/types';

export const buttonStyles: { [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: ButtonVariant.Filled, color: ButtonColor.Success },
  secondary: { variant: ButtonVariant.Outline, color: ButtonColor.Primary },
};

export type IActionButton = PropsFromGenericComponent<'ActionButton'>;

export function ActionButtonComponent({ node }: IActionButton) {
  const dispatch = useDispatch();
  const actionPermissions = useAppSelector((state) => state.process.actions);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  const { action, buttonStyle, id, textResourceBindings } = node.item;
  const disabled = !actionPermissions?.[action];

  function handleClick() {
    if (!disabled) {
      dispatch(
        ProcessActions.complete({
          action,
        }),
      );
    }
  }

  const buttonText =
    getTextResourceByKey(textResourceBindings?.title, textResources) ??
    getLanguageFromKey(`actions.${action}`, language ?? {});

  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <div className={classes.container}>
      <Button
        id={`action-button-${id}`}
        variant={variant}
        color={color}
        disabled={disabled}
        onClick={handleClick}
      >
        {buttonText}
      </Button>
    </div>
  );
}
