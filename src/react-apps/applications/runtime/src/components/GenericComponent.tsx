import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { formComponentWithHandlers } from '../containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import FormDynamicsActions from '../features/form/dynamics/actions';
import { IDataModelBindings, ILayoutComponent, ILayoutContainer, ITextResourceBindings } from '../features/form/layout/types';
import ValidationActions from '../features/form/validation/actions';
import { makeGetLayoutElement } from '../selectors/getLayoutData';
import { IAltinnWindow, IRuntimeState } from '../types';
import { IComponentValidations } from '../types/global';
import components from './';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
}

export interface IGenericComponentProps extends IProvidedProps {
  isValid: boolean;
  textResources: any;
  layoutElement: ILayoutContainer | ILayoutComponent;
}

class GenericComponent extends React.Component<IGenericComponentProps, any> {

  public handleDataUpdate = (value: any, key: string = 'simpleBinding') => {
    if (!this.props.dataModelBindings || !this.props.dataModelBindings[key]) {
      return;
    }
    const dataModelField = this.props.dataModelBindings[key];
    FormDataActions.updateFormData(dataModelField, value, this.props.id);
    FormDynamicsActions.checkIfConditionalRulesShouldRun();
    const component = this.props.layoutElement as ILayoutComponent;
    if (component && component.triggerValidation) {
      const altinnWindow: IAltinnWindow = window as IAltinnWindow;
      const { org, service, instanceId, reportee } = altinnWindow;
      const url = `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`;
      ValidationActions.runSingleFieldValidation(url, dataModelField);
    }
  }
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource: any) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  public render() {
    const Component = formComponentWithHandlers(components.find((c: any) =>
      c.name === this.props.type,
    ).Tag);
    if (this.props.layoutElement.hidden) {
      return null;
    }
    return (
      <Component
        {...this.props}
        title={getLanguageFromKey(this.props.textResourceBindings.title, this.props.textResources)}
        handleDataChange={this.handleDataUpdate}
        getTextResource={this.getTextResource}
        isValid={this.props.isValid}
      />
    );
  }
}

const isComponentValid = (validations: IComponentValidations): boolean => {
  if (!validations) {
    return true;
  }
  let isValid: boolean = true;

  Object.keys(validations).forEach((key: string) => {
    if (validations[key].errors.length > 0) {
      isValid = false;
      return;
    }
  });
  return isValid;
};

const makeMapStateToProps = () => {
  const getLayoutElement = makeGetLayoutElement();
  const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => {
    return {
      layoutElement: getLayoutElement(state, props),
      isValid: isComponentValid(state.formValidations.validations[props.id]),
      textResources: state.formResources.languageResource.resources,
      ...props,
    };
  };
  return mapStateToProps;
};

export const GenericComponentWrapper = connect(makeMapStateToProps)(GenericComponent);
