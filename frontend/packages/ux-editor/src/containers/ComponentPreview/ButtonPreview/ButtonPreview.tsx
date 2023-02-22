import React from 'react';
import { Button, ButtonVariant, ButtonColor } from '@digdir/design-system-react';
import { IAppState, IFormButtonComponent } from '../../../types/global';
import { getTextResource } from '../../../utils/language';
import { useSelector } from 'react-redux';
import { ComponentTypes } from '../../../components';
import classes from './ButtonPreview.module.css';

export interface ButtonPreviewProps {
  component: IFormButtonComponent;
}

export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => {
  const textLanguage = useSelector(
    (state: IAppState) => state.appData.textResources.resources?.['nb']
  );

  const isNavigationButton = component.type === ComponentTypes.NavigationButtons;
  const buttonColor = isNavigationButton ? ButtonColor.Primary : ButtonColor.Success;
  const navigationButtonText = component.showBackButton
    ? component.textResourceBindings?.back
    : component.textResourceBindings?.next;
  const buttonText = isNavigationButton
    ? navigationButtonText
    : component.textResourceBindings?.title;
  const buttonsToPreview = isNavigationButton
    ? [
        {
          variant: ButtonVariant.Filled,
          color: buttonColor,
          text: getTextResource(component.textResourceBindings?.back, textLanguage),
        },
        {
          variant: ButtonVariant.Filled,
          color: buttonColor,
          text: getTextResource(component.textResourceBindings?.next, textLanguage),
        },
      ]
    : [
        {
          variant: ButtonVariant.Filled,
          color: buttonColor,
          text: getTextResource(buttonText, textLanguage),
        },
      ];

  return (
    <div className={classes.root}>
      {buttonsToPreview.map(({ text, variant, color }) => (
        <Button key={text} color={color} variant={variant}>
          {text}
        </Button>
      ))}
    </div>
  );
};
