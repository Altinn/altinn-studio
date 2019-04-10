import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';
import { IRuntimeState } from '../reducers';

export interface IContainerProps {
  components: any;
  textResources: any;
}

export interface IComponent extends IFormComponent {
  id: string;
}

const ContainerComponent = (props: IContainerProps) => {
  const formComponents: any[] = [];
  Object.values(props.components).forEach((obj: any, key: number) => {
    const formComponentIds = Object.keys(props.components);
    obj.id = formComponentIds[key];
    console.log(obj);
    formComponents.push(obj);
  });

  /**
   * Render label
   */
  const renderLabel = (component: IComponent): JSX.Element => {
    console.log(component);
    if (component.component === 'Header' ||
      component.component === 'Paragraph' ||
      component.component === 'Submit' ||
      component.component === 'ThirdParty' ||
      component.component === 'AddressComponent') {
      return null;
    }
    if (!component.textResourceBindings) {
      return null;
    }
    if (component.textResourceBindings.title) {
      const label: string = getTextResource(component.textResourceBindings.title);
      return (
        <label className='a-form-label title-label' htmlFor={component.id}>
          {label}
          {component.required ? null :
            // TODO: Get text key from common texts for all services.
            <span className='label-optional'>{getTextResource('(Valgfri)')}</span>
          }
        </label>
      );
    }

    return null;
  };

  /**
   * Render description
   */
  const renderDescription = (component: IComponent): JSX.Element => {
    if (!component.textResourceBindings) {
      return null;
    }
    if (component.textResourceBindings.description) {
      const description: string = getTextResource(component.textResourceBindings.description);
      return (
        <span className='a-form-label description-label'>{description}</span>
      );
    }

    return null;
  };

  const handleComponentDataUpdate = () => {
    // something
  };

  const getTextResource = (resourceKey: string): string => {
    const textResource = props.textResources.find((resource: any) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  };

  return (
    <div>
      {formComponents.map((formComponent: any) => (
        <div className='row mt-2' key={formComponent.id}>
          <div className='col'>
            <div className='a-form-group'>
              {renderLabel(formComponent)}
              {renderDescription(formComponent)}
              <GenericComponentWrapper
                id={formComponent.id}
                component={formComponent}
                isValid={formComponent.isValid}
                formData={formComponent.formData}
                handleDataChange={handleComponentDataUpdate}
                getTextResource={getTextResource}
                thirdPartyComponents={formComponent.thirdPartyComponents}
                validationMessages={formComponent.validationResults}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

};

const mapStateToProps = (state: IRuntimeState): IContainerProps => {
  return {
    components: state.formLayout.components,
    textResources: state.formDataModel.dataModel,
  };
};
export const Container = connect(mapStateToProps)(ContainerComponent);
