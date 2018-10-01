import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatchers from '../actions/apiActions/apiActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import RuleConnectionActionDispatchers from '../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import { EditContainer } from '../containers/EditContainer';
import { CheckboxContainerComponent } from './base/CheckboxesContainerComponent';
import { DropdownComponent } from './base/DropdownComponent';
import { FileUploadComponent } from './base/FileUploadComponent';
import { HeaderComponent } from './base/HeaderComponent';
import { InputComponent } from './base/InputComponent';
import { RadioButtonContainerComponent } from './base/RadioButtonsContainerComponent';
import { TextAreaComponent } from './base/TextAreaComponent';
import { SubmitComponent } from './widget/SubmitComponent';

import { makeGetFormDataSelector } from '../selectors/getFormData';

/**
 * Properties defined for input for wrapper
 */
export interface IProvidedProps {
  id: string;
}

/**
 * Properties for the component itself. mapStateToProps convert to this from
 */
export interface IFormElementProps extends IProvidedProps {
  component: FormComponentType;
  designMode: boolean;
  connections: any;
  formData: any;
  externalApi: any;
  dataModelElement: IDataModelFieldElement;
  validationErrors: any[];
  textResources: any[];
}

/**
 * The component state
 */
export interface IFormElementState {
  component: FormComponentType;
}

/**
 * The component constructur
 */
class FormComponent extends React.Component<
  IFormElementProps,
  IFormElementState
  > {
  constructor(_props: IFormElementProps, _state: IFormElementState) {
    super(_props, _state);

    this.state = {
      component: _props.component,
    };
  }

  /**
   * This is the event handler that triggers the Redux Actions
   * that is sendt to the different Action dispatcher.
   * This event handler is used for all form components rendered from this
   */
  public handleComponentDataUpdate = (callbackValue: any): void => {
    if (!this.props.component.dataModelBinding) {
      return;
    }

    FormFillerActionDispatchers.updateFormData(
      this.props.id,
      callbackValue,
      this.props.dataModelElement,
    );

    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun();
    ApiActionDispatchers.checkIfApiShouldFetch(this.props.id, this.props.dataModelElement, callbackValue);
    RuleConnectionActionDispatchers.checkIfRuleShouldRun(this.props.id, this.props.dataModelElement, callbackValue);
  }

  /**
   * This is the method that renders the configured form components in FormLayout.json
   */
  public renderComponent(): JSX.Element {
    const isValid = !this.errorMessage();
    switch (this.props.component.component) {
      case 'Header': {
        return (
          <HeaderComponent
            component={this.props.component}
            text={this.getTextResource(this.props.component.title)}
            size={(this.props.component as IFormHeaderComponent).size}
          />
        );
      }
      case 'Input': {
        return (
          <InputComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'Checkboxes': {
        return (
          <CheckboxContainerComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            getTextResource={this.getTextResource}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'TextArea': {
        return (
          <TextAreaComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'RadioButtons': {
        return (
          <RadioButtonContainerComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'Dropdown': {
        return (
          <DropdownComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'FileUpload': {
        return (
          <FileUploadComponent
            id={this.props.id}
            component={this.props.component}
            handleDataChange={this.handleComponentDataUpdate}
            isValid={isValid}
            formData={this.props.formData}
          />
        );
      }
      case 'Submit': {
        return (
          <SubmitComponent
            id={this.props.id}
            component={this.props.component}
            text={this.getTextResource(this.props.component.textResourceId)}
          />
        );
      }
      default: {
        return null;
      }
    }
  }

  /**
   * Return a given textresource from all textresources avaiable
   */
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find(resource => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  /**
   * Render label
   */
  public renderLabel = (): JSX.Element => {
    const label: string =
      this.props.designMode ? this.props.component.title : this.getTextResource(this.props.component.title);
    if (this.props.component.component === 'Header' ||
      this.props.component.component === 'Checkboxes' ||
      this.props.component.component === 'Submit') {
      return null;
    }

    return (
      <label className='a-form-label' htmlFor={this.props.id}>
        {label}
      </label>
    );
  }

  /**
   * Method that allows user to set focus to elements in the compoenent
   * instead of opening the edition modal on click.
   */
  public disableEditOnClickForAddedComponent = (e: any) => {
    e.stopPropagation();
  }

  /**
   * The React Render method. This is run when this component is included in another component.
   * It is either called from FormFiller or FormDesigner.
   */
  public render(): JSX.Element {
    if (!this.props.designMode) {
      return (
        <div className='row mt-2'>
          <div className='col'>
            <div className='form-group a-form-group'>
              {this.renderLabel()}
              {this.renderComponent()}
              {this.errorMessage()}
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        <EditContainer
          component={this.props.component}
          id={this.props.id}
        >
          <div className='form-group a-form-group' onClick={this.disableEditOnClickForAddedComponent}>
            {this.renderLabel()}
            {this.renderComponent()}
          </div>
        </EditContainer>
      </>
    );
  }

  private errorMessage(): JSX.Element {
    if (this.props.validationErrors && this.props.validationErrors.length > 0) {
      return (
        <span className='field-validation-error a-message a-message-error'>
          <p>Validation fails:</p>
          <ul>
            {this.props.validationErrors.map((error: string, index: number) => {
              return <li key={index}>{error}</li>;
            })}
          </ul>
        </span>
      );
    }
    return null;
  }
}

/**
 * Map values from Provided props and store to FormElementProps
 * @param state the state
 * @param props the input props give as input from formFiller component
 */
const makeMapStateToProps = () => {
  const GetFormDataSelector = makeGetFormDataSelector();
  const mapStateToProps = (state: IAppState, props: IProvidedProps): IFormElementProps => ({
    id: props.id,
    component: state.formDesigner.layout.components[props.id],
    designMode: state.appData.appConfig.designMode,
    dataModelElement: state.appData.dataModel.model.find(
      element => element.DataBindingName === state.formDesigner.layout.components[props.id].dataModelBinding),
    connections: state.serviceConfigurations.APIs.connections,
    formData: GetFormDataSelector(state, props),
    externalApi: state.serviceConfigurations.APIs.externalApisById,
    validationErrors:
      Object.keys(state.formFiller.validationErrors).length > 0
        ? state.formFiller.validationErrors[props.id]
        : null,
    textResources: state.appData.textResources.resources,
  });
  return mapStateToProps;
};

/**
 * Wrapper made avaiable for other compoments
 */
export const FormComponentWrapper = connect(makeMapStateToProps)(FormComponent);
