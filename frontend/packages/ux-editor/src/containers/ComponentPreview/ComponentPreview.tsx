import React from 'react';
import { IGenericEditComponent } from '../../components/config/componentConfig';
import { FormItemType } from 'app-shared/types/FormItemType';
import { CheckboxGroupPreview } from './CheckboxGroupPreview';
import { RadioGroupPreview } from './RadioGroupPreview';
import { ButtonPreview } from './ButtonPreview';
import { useComponentErrorMessage } from '../../hooks';
import { ErrorMessage } from '@digdir/design-system-react';

export interface ComponentPreviewProps extends IGenericEditComponent {}

export const ComponentPreview = ({
  component,
  handleComponentChange,
  layoutName,
}: ComponentPreviewProps) => {
  const errorMessage = useComponentErrorMessage(component);

  if (errorMessage) {
    return <ErrorMessage>{errorMessage}</ErrorMessage>;
  }

  switch (component.type) {
    case FormItemType.Checkboxes:
      return (
        <CheckboxGroupPreview
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    case FormItemType.RadioButtons:
      return (
        <RadioGroupPreview
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    case FormItemType.Button:
    case FormItemType.NavigationButtons:
      return <ButtonPreview component={component} />;
    default:
      return <p>Forhåndsvisning er ikke implementert for denne komponenten.</p>;
  }
};
