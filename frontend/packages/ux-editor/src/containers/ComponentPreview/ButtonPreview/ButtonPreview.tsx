import React from 'react';
import { Button, ButtonVariant, ButtonColor } from '@digdir/design-system-react';
import { IAppState, IFormButtonComponent } from '../../../types/global';
import { getTextResource } from '../../../utils/language';
import { useSelector } from 'react-redux';
import { ComponentTypes } from '../../../components';
import clasess from "./ButtonPreview.module.css";

export interface ButtonPreviewProps {
  component: IFormButtonComponent;
}

export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => { 

  // Extract resource for norwegian language and assign it to language const.
  const language = useSelector((state: IAppState) => state.appData.textResources.resources?.['nb']);
 
  // Determine the type of the button, and then chose its color, text, and back/next button.
  const isNavigationButton = component.type === ComponentTypes.NavigationButtons;
  const buttonColor = isNavigationButton ? ButtonColor.Primary : ButtonColor.Success;
  const navigationButtonText = component.showBackButton
    ? component.textResourceBindings?.back
    : component.textResourceBindings?.next;
  const buttonText = isNavigationButton? navigationButtonText : component.textResourceBindings?.title; 

  // Render the button based on its type; either Send or navigation(Back/Next). 
  return (
    <div className={clasess.root}>
      <Button variant={ButtonVariant.Filled} color={buttonColor}>
        {getTextResource(buttonText, language)}
      </Button>
      {isNavigationButton && component.showBackButton && (
        <Button className={clasess.showNextButton} variant={ButtonVariant.Filled} color={buttonColor}>
          {getTextResource(component.textResourceBindings?.next, language,)}
        </Button>
      )}
    </div>
  );
};
