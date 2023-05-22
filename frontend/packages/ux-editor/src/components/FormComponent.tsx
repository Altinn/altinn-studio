import React from 'react';
import { useParams } from 'react-router-dom';
import { EditFormComponent } from './EditFormComponent';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../selectors/formLayoutSelectors';
import { ComponentType } from './index';
import { useTextResourcesQuery } from '../../../../app-development/hooks/queries/useTextResourcesQuery';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import { ConnectDragSource } from 'react-dnd';

export interface IFormElementProps {
  id: string;
  partOfGroup?: boolean;
  dragHandleRef?: ConnectDragSource;
}

export const FormComponent = ({
  id,
  partOfGroup,
  dragHandleRef,
}: IFormElementProps) => {
  const { org, app } = useParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { layout } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const component: IFormComponent = layout.components[id];

  /**
   * Return a given textresource from all textresources avaiable
   */
  const getTextResource = (resourceKey: string): string => {
    const textResource = textResources?.[DEFAULT_LANGUAGE]?.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  };

  /**
   * Render label
   */
  const renderLabel = (): JSX.Element => {
    const componentsWithoutLabel = [
      ComponentType.Header,
      ComponentType.Paragraph,
      ComponentType.ThirdParty,
      ComponentType.AddressComponent,
    ];
    if (componentsWithoutLabel.includes(component.type)) {
      return null;
    }
    if (!component.textResourceBindings) {
      return null;
    }
    if (component.textResourceBindings.title) {
      const label: string = getTextResource(component.textResourceBindings.title);
      return (
        <label className='a-form-label title-label' htmlFor={id}>
          {label}
          {component.required ? null : (
            // TODO: Get text key from common texts for all services.
            <span className='label-optional'>{getTextResource('(Valgfri)')}</span>
          )}
        </label>
      );
    }

    return null;
  };

  return (
    <EditFormComponent
      component={component}
      id={id}
      partOfGroup={partOfGroup}
      dragHandleRef={dragHandleRef}
    >
      <button className={'divider'}>
        {renderLabel()}
      </button>
    </EditFormComponent>
  );
};
