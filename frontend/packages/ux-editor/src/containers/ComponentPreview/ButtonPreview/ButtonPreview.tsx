import React from 'react';
import { Button, ButtonVariant, ButtonColor } from '@digdir/design-system-react';
import { IFormButtonComponent } from '../../../types/global';
import { getTextResource } from '../../../utils/language';
import { ComponentType } from '../../../components';
import classes from './ButtonPreview.module.css';
import { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../hooks/useTextResourcesSelector';
import { textResourcesByLanguageSelector } from '../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export interface ButtonPreviewProps {
  component: IFormButtonComponent;
}

export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => {
  const texts: ITextResource[] = useTextResourcesSelector<ITextResource[]>(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));

  const isNavigationButton = component.type === ComponentType.NavigationButtons;
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
          text: getTextResource(component.textResourceBindings?.back, texts),
        },
        {
          variant: ButtonVariant.Filled,
          color: buttonColor,
          text: getTextResource(component.textResourceBindings?.next, texts),
        },
      ]
    : [
        {
          variant: ButtonVariant.Filled,
          color: buttonColor,
          text: getTextResource(buttonText, texts),
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
