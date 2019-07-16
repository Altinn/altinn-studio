import * as React from 'react';
import { connect } from 'react-redux';
import { getLanguageFromKey } from '../../../shared/src/utils/language';
import { formComponentWithHandlers } from '../features/form/containers/withFormElementHandlers';
import FormDataActions from '../features/form/data/actions';
import { IFormData } from '../features/form/data/reducer';
import FormDynamicsActions from '../features/form/dynamics/actions';
import { IDataModelBindings, ILayoutComponent, ILayoutGroup, ITextResourceBindings } from '../features/form/layout/';
import RuleActions from '../features/form/rules/actions';
import ValidationActions from '../features/form/validation/actions';
import { makeGetFormDataSelector } from '../selectors/getFormData';
import { makeGetLayoutElement } from '../selectors/getLayoutData';
import { IAltinnWindow, IRuntimeState } from '../types';
import { IDataModelFieldElement, ITextResource } from '../types/global';
import { IComponentValidations } from '../types/global';
import components from './';

export interface IProvidedProps {
  id: string;
  type: string;
  textResourceBindings: ITextResourceBindings;
  dataModelBindings: IDataModelBindings;
}

export interface IGenericComponentProps extends IProvidedProps {
  dataModel: IDataModelFieldElement[];
  formData: IFormData;
  isValid: boolean;
  textResources: ITextResource[];
  layoutElement: ILayoutGroup | ILayoutComponent;
  unsavedChanges: boolean;
}

export class GenericComponentClass extends React.Component<IGenericComponentProps, any> {

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
      const { org, service, instanceId } = altinnWindow;
      const url = `${window.location.origin}/${org}/${service}/api/${instanceId}`;
      ValidationActions.runSingleFieldValidation(url, dataModelField);
    }
    const dataModelElement = this.props.dataModel.find(
      (element) => element.DataBindingName === this.props.dataModelBindings[key],
    );
    RuleActions.checkIfRuleShouldRun(this.props.id, dataModelElement, value);
  }
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource: any) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }
  public getFormData = (): string | {} => {
    if (!this.props.dataModelBindings ||
      Object.keys(this.props.dataModelBindings).length === 0) {
      return '';
    }
    const valueArr: { [id: string]: string } = {};
    for (const dataBindingKey in this.props.dataModelBindings) {
      if (!dataBindingKey) {
        continue;
      }
      valueArr[dataBindingKey] = this.props.formData[this.props.dataModelBindings[dataBindingKey]];
    }
    if (Object.keys(valueArr).indexOf('simpleBinding') >= 0) {
      // Simple component
      return valueArr.simpleBinding;
    } else {
      // Advanced component
      return valueArr;
    }
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
        formData={this.getFormData()}
        isValid={this.props.isValid}
      />
    );
  }
}

export const isComponentValid = (validations: IComponentValidations): boolean => {
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
  const GetFormDataSelector = makeGetFormDataSelector();
  const GetLayoutElement = makeGetLayoutElement();
  const mapStateToProps = (state: IRuntimeState, props: IProvidedProps): IGenericComponentProps => {
    return {
      dataModel: state.formDataModel.dataModel,
      layoutElement: GetLayoutElement(state, props),
      isValid: isComponentValid(state.formValidations.validations[props.id]),
      textResources: state.formResources.languageResource.resources,
      formData: GetFormDataSelector(state, props),
      unsavedChanges: state.formData.unsavedChanges,
      ...props,
    };
  };
  return mapStateToProps;
};

export const GenericComponent = connect(makeMapStateToProps)(GenericComponentClass);
