import React from 'react';
import { Button, ButtonVariant, ButtonColor } from '@digdir/design-system-react';
import { IAppState, IFormButtonComponent } from '../../../types/global';
import { getTextResource } from '../../../utils/language';
import { useSelector } from 'react-redux';
import { ComponentTypes } from '../../../components';

export interface ButtonPreviewProps {
  component: IFormButtonComponent;
}
export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => {
  const language = useSelector((state: IAppState) => state.appData.textResources.resources?.['nb']);

  const isNavigationButton = component.type === ComponentTypes.NavigationButtons;
  const buttonColor = isNavigationButton ? ButtonColor.Primary : ButtonColor.Success;

  const navigationButtonText = component.showBackButton
    ? component.textResourceBindings?.back
    : component.textResourceBindings?.next;

  const buttonText = isNavigationButton
    ? navigationButtonText
    : component.textResourceBindings?.title;

  return (
    <Button variant={ButtonVariant.Filled} color={buttonColor}>
      {getTextResource(buttonText, language)}
    </Button>
  );
};
