import {
  createStyles, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditContainer } from '../containers/EditContainer';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import GenericComponent from './GenericComponent';

const styles = createStyles({

});

/**
 * Properties defined for input for wrapper
 */
export interface IProvidedProps {
  id: string;
  formData: any;
  activeList: any[];
  handleDataUpdate: (id: string, dataModelElement: any, value: any) => void;
  classes: any;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendListToParent: any;
  singleSelected: boolean;
}

/**
 * Properties for the component itself. mapStateToProps convert to this from
 */
export interface IFormElementProps extends IProvidedProps {
  component: FormComponentType;
  designMode: boolean;
  connections: any;
  externalApi: any;
  dataModelElement: IDataModelFieldElement;
  dataModel: IDataModelFieldElement[];
  validationErrors: any[];
  textResources: any[];
  thirdPartyComponents: any;
  order: any[];
}

/**
 * The component state
 */
export interface IFormElementState {
  component: FormComponentType;
  activeList: any[];
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
      activeList: _props.activeList,
    };
  }

  /**
   * This is the event handler that triggers the Redux Actions
   * that is sendt to the different Action dispatcher.
   * This event handler is used for all form components rendered from this
   */
  public handleComponentDataUpdate = (callbackValue: any, key: string = 'simpleBinding'): void => {
    if (!this.props.component.dataModelBindings || !this.props.component.dataModelBindings[key]) {
      return;
    }
    const dataModelElement = this.props.dataModel.find(
      (element) => element.DataBindingName === this.props.component.dataModelBindings[key],
    );
    this.props.handleDataUpdate(this.props.id, dataModelElement, callbackValue);
  }

  /**
   * This is the method that renders the configured form components in FormLayout.json
   */
  public renderComponent(): JSX.Element {
    const isValid = !this.errorMessage();
    return (
      <GenericComponent
        id={this.props.id}
        component={this.props.component}
        isValid={isValid}
        formData={this.props.formData}
        handleDataChange={this.handleComponentDataUpdate}
        getTextResource={this.getTextResource}
        designMode={this.props.designMode}
        thirdPartyComponents={this.props.thirdPartyComponents}
      />
    );
  }

  /**
   * Return a given textresource from all textresources avaiable
   */
  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  /**
   * Render label
   */
  public renderLabel = (): JSX.Element => {
    if (this.props.component.component === 'Header' ||
      this.props.component.component === 'Paragraph' ||
      this.props.component.component === 'Submit' ||
      this.props.component.component === 'ThirdParty' ||
      this.props.component.component === 'AddressComponent') {
      return null;
    }
    if (!this.props.component.textResourceBindings) {
      return null;
    }
    if (this.props.component.textResourceBindings.title) {
      const label: string =
        this.props.designMode ?
          this.props.component.textResourceBindings.title :
          this.getTextResource(this.props.component.textResourceBindings.title);
      return (
        <label className='a-form-label title-label' htmlFor={this.props.id}>
          {label}
          {this.props.component.required ? null :
            // TODO: Get text key from common texts for all services.
            <span className='label-optional'>{this.getTextResource('(Valgfri)')}</span>
          }
        </label>
      );
    }

    return null;
  }

  public renderDescription = (): JSX.Element => {
    if (!this.props.component.textResourceBindings) {
      return null;
    }
    if (this.props.component.textResourceBindings.description) {
      const description: string =
        this.props.designMode ?
          this.props.component.textResourceBindings.description :
          this.getTextResource(this.props.component.textResourceBindings.description);
      return (
        <span className='a-form-label description-label'>{description}</span>
      );
    }

    return null;
  }

  /**
   * Method that allows user to set focus to elements in the compoenent
   * instead of opening the edit modal on click.
   */
  public disableEditOnClickForAddedComponent = (e: any) => {
    e.stopPropagation();
  }

  public handleActiveListChange = (obj: any) => {
    FormDesignerActionDispatchers.updateActiveList(obj, this.props.activeList);
    this.props.sendListToParent(this.props.activeList);
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
            <div className='a-form-group'>
              {this.renderLabel()}
              {this.renderDescription()}
              {this.renderComponent()}
              {this.errorMessage()}
            </div>
          </div>
        </div>
      );
    }
    const key: any = Object.keys(this.props.order)[0];
    const order = this.props.order[key].indexOf(this.props.id);
    return (
      <EditContainer
        component={this.props.component}
        id={this.props.id}
        order={order}
        firstInActiveList={this.props.firstInActiveList}
        lastInActiveList={this.props.lastInActiveList}
        sendItemToParent={this.handleActiveListChange}
        singleSelected={this.props.singleSelected}
      >
        <div onClick={this.disableEditOnClickForAddedComponent}>
          {this.renderLabel()}
          {this.renderComponent()}
        </div>
      </EditContainer>
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
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const mapStateToProps = (state: IAppState, props: IProvidedProps): IFormElementProps => ({
    activeList: props.activeList,
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    formData: props.formData,
    classes: props.classes,
    handleDataUpdate: props.handleDataUpdate,
    sendListToParent: props.sendListToParent,
    singleSelected: props.singleSelected,
    component: state.formDesigner.layout.components[props.id],
    order: GetLayoutOrderSelector(state),
    designMode: state.appData.appConfig.designMode,
    dataModelElement: state.appData.dataModel.model.find(
      (element) =>
        element.DataBindingName ===
        state.formDesigner.layout.components[props.id].dataModelBindings.simpleBinding),
    connections: state.serviceConfigurations.APIs.connections,
    externalApi: state.serviceConfigurations.APIs.externalApisById,
    validationErrors:
      Object.keys(state.formFiller.validationErrors).length > 0
        ? state.formFiller.validationErrors[props.id]
        : null,
    textResources: state.appData.textResources.resources,
    thirdPartyComponents: state.thirdPartyComponents.components,
    dataModel: state.appData.dataModel.model,
  });
  return mapStateToProps;
};

/**
 * Wrapper made available for other compoments
 */
export const FormComponentWrapper =
  withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(FormComponent));
