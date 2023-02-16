import React from 'react';
import { Button, ButtonVariant, ButtonColor } from '@digdir/design-system-react';
import { IAppState, IFormButtonComponent } from '../../../types/global';
import { getTextResource } from '../../../utils/language';
import { useSelector } from 'react-redux';



interface ButtonPreviewProps {
  component: IFormButtonComponent;

}

export const ButtonPreview = ({ component }: ButtonPreviewProps): JSX.Element => {
  const language = useSelector(
    (state: IAppState) => state.appData.textResources.resources?.['nb']
  );

  return (
    <Button variant={ButtonVariant.Outline} color={ButtonColor.Primary}>
      {getTextResource(component.textResourceBindings?.title, language)}
    </Button>
  );
};



