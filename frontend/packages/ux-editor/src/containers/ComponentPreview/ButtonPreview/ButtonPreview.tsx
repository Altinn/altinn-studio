import React from 'react';
import { Button } from '@digdir/design-system-react';
import { getTextResource } from '../../../utils/language';
import { ComponentType } from 'app-shared/types/ComponentType';
import classes from './ButtonPreview.module.css';
import { ITextResource } from 'app-shared/types/global';
import { useText, useTextResourcesSelector } from '../../../hooks';
import { textResourcesByLanguageSelector } from '../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { FormButtonComponent } from '../../../types/FormComponent';

interface ButtonToPreviewType {
  color: 'inverted' | 'danger' | 'primary' | 'secondary' | 'success';
  variant: 'filled' | 'outline' | 'quiet';
  text: string;
}

export interface ButtonPreviewProps {
  component: FormButtonComponent;
}

export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => {
  const t = useText();
  const texts: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );

  const isNavigationButton = component.type === ComponentType.NavigationButtons;
  const buttonColor = isNavigationButton ? 'primary' : 'success';
  const navigationButtonText = component.showBackButton
    ? component.textResourceBindings?.back
    : component.textResourceBindings?.next;
  const buttonText = isNavigationButton
    ? navigationButtonText
    : component.textResourceBindings?.title;
  const buttonsToPreview: ButtonToPreviewType[] = isNavigationButton
    ? [
        {
          variant: 'filled',
          color: buttonColor,
          text:
            getTextResource(component.textResourceBindings?.back, texts) ||
            t('ux_editor.modal_properties_button_type_back'),
        },
        {
          variant: 'filled',
          color: buttonColor,
          text:
            getTextResource(component.textResourceBindings?.next, texts) ||
            t('ux_editor.modal_properties_button_type_next'),
        },
      ]
    : [
        {
          variant: 'filled',
          color: buttonColor,
          text:
            getTextResource(buttonText, texts) ||
            t('ux_editor.modal_properties_button_type_submit'),
        },
      ];

  return (
    <div className={classes.root}>
      {buttonsToPreview.map(({ text, variant, color }) => (
        <Button key={text} color={color} variant={variant} size='small'>
          {text}
        </Button>
      ))}
    </div>
  );
};
