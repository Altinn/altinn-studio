import React from 'react';
import { useParams } from 'react-router-dom';
import type { EditorDndEvents } from '../containers/helpers/dnd-types';
import { EditFormComponent } from './EditFormComponent';
import type { FormComponentType } from '../types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { ComponentType } from './index';
import { useTextResourcesQuery } from '../../../../app-development/hooks/queries/useTextResourcesQuery';
import { DroppableDraggableComponent } from '../containers/DroppableDraggableComponent';

export interface IFormElementProps {
  id: string;
  containerId: string;
  index: number;
  partOfGroup?: boolean;
  dndEvents: EditorDndEvents;
}

export const FormComponent = (props: IFormElementProps) => {
  const { org, app } = useParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  const { components } = useFormLayoutsSelector(selectedLayoutSelector);
  const component: FormComponentType = components[props.id];

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
        <label className='a-form-label title-label' htmlFor={props.id}>
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
    <DroppableDraggableComponent
      canDrag
      containerId={props.containerId}
      dndEvents={props.dndEvents}
      id={props.id}
      index={props.index}
      component={(dragHandleRef) => (
        <EditFormComponent
          component={component}
          id={props.id}
          partOfGroup={props.partOfGroup}
          dragHandleRef={dragHandleRef}
        >
          <button className={'divider'}>
            {renderLabel()}
          </button>
        </EditFormComponent>
      )}
    />
  );
};
