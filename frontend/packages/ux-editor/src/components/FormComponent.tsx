import React from 'react';
import { connect } from 'react-redux';
import { EditContainer } from '../containers/EditContainer';
import type { IAppState } from '../types/global';
import { ConnectDragSource } from 'react-dnd';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useParams } from 'react-router-dom';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { ComponentType } from './index';
import { useTextResourcesQuery } from '../../../../app-development/hooks/queries/useTextResourcesQuery';
import type { FormComponent as IFormComponent } from '../types/FormComponent';

/**
 * Properties defined for input for wrapper
 */
export interface IProvidedProps {
  id: string;
  partOfGroup?: boolean;
  dragHandleRef: ConnectDragSource;
}

/**
 * Properties for the component itself. mapStateToProps convert to this from
 */
export interface IFormElementProps extends IProvidedProps {
  validationErrors: any[];
}

const FormComponent = (props: IFormElementProps) => {
  const { org, app } = useParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  const { components } = useFormLayoutsSelector(selectedLayoutSelector);
  const component: IFormComponent = components[props.id];

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
    <div>
      <EditContainer
        component={component}
        id={props.id}
        partOfGroup={props.partOfGroup}
        dragHandleRef={props.dragHandleRef}
      >
        <button className={'divider'}>
          {renderLabel()}
        </button>
      </EditContainer>
    </div>
  );
};

const makeMapStateToProps = () => {
  return (state: IAppState, props: IProvidedProps): IFormElementProps => ({
    id: props.id,
    validationErrors: null,
    dragHandleRef: props.dragHandleRef,
  });
};

/**
 * Wrapper made available for other compoments
 */
export const FormComponentWrapper = connect(makeMapStateToProps)(FormComponent);
