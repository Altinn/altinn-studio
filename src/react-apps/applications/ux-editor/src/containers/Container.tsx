import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatchers from '../actions/apiActions/apiActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import RuleConnectionActionDispatchers from '../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import { FormComponentWrapper } from '../components/FormComponent';
import { SwitchComponent } from '../components/widget/SwitchComponent';
import { makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetFormDataSelector } from '../selectors/getFormData';
import { makeGetActiveFormContainer, makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import '../styles/index.css';

export interface IProvidedContainerProps {
  id: string;
  baseContainer?: boolean;
}

export interface IContainerProps extends IProvidedContainerProps {
  dataModelGroup?: string;
  itemOrder: any;
  components: any;
  containers: any;
  repeating: boolean;
  designMode: boolean;
  formData: any;
  index?: number;
  formContainerActive?: boolean;
}

export class ContainerComponent extends React.Component<IContainerProps> {

  public handleContainerDelete = (e: any) => {
    FormDesignerActionDispatchers.deleteFormContainer(this.props.id, this.props.index);
    e.stopPropagation();
  }

  public handleComponentDataUpdate = (
    id: string,
    dataModelElement: IDataModelFieldElement,
    callbackValue: any,
  ): void => {
    const dataBindingName = this.isRepeating() ? dataModelElement.DataBindingName.replace(this.props.dataModelGroup,
      this.props.dataModelGroup + `[${this.props.index}]`) : dataModelElement.DataBindingName;
    FormFillerActionDispatchers.updateFormData(
      id,
      callbackValue,
      dataModelElement,
      dataBindingName,
    );

    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun();
    RuleConnectionActionDispatchers.checkIfRuleShouldRun(id, dataModelElement, callbackValue, this.props.repeating, this.props.dataModelGroup, this.props.index);
    ApiActionDispatchers.checkIfApiShouldFetch(id, dataModelElement, callbackValue, this.props.repeating, this.props.dataModelGroup, this.props.index);
  }

  public isRepeating = (): boolean => {
    return (this.props.index || this.props.index > -1) && this.props.dataModelGroup && this.props.repeating;
  }

  public render() {
    return (
      <div>
        <div
          className={this.props.baseContainer ? 'col-12' : this.props.formContainerActive ? 'col-12 a-btn-action a-bgBlueLighter cursorPointer' : 'col-12 a-btn-action cursorPointer'}
          onClick={this.changeActiveFormContainer}
        >
          {
            this.props.designMode && !this.props.baseContainer &&
            <div className='row'>
              <div className='col-1'>
                {this.renderDeleteGroupButton()}
              </div>
              <div className='col-3 offset-8 row'>
                <span className='col-6'>Repeating:</span>
                <div className='col-5'>
                  <SwitchComponent isChecked={this.props.repeating} toggleChange={this.toggleChange} />
                </div>
              </div>
            </div>
          }

          {this.props.itemOrder.map((id: string, index: number) => (
            this.props.components[id] ? this.renderFormComponent(id, index) :
              (this.props.containers[id] ? this.renderContainer(id) : null)
          ))}
          {
            !this.props.designMode && this.props.index !== 0 && !this.props.baseContainer &&
            <button
              className={'a-btn a-btn-action offset-10'}
              onClick={this.handleContainerDelete}
            >
              <span>Fjern gruppe</span>
            </button>
          }
        </div>

        {!this.props.designMode && this.renderNewGroupButton()}
      </div>
    );
  }

  public renderContainer = (id: string) => {
    if (this.props.containers[id].hidden && !this.props.designMode) {
      return null;
    }
    return (
      <Container
        id={id}
        key={id}
        baseContainer={false}
      />
    );
  }

  public renderDeleteGroupButton = (): JSX.Element => {
    if (this.props.baseContainer) {
      return null;
    }
    return (
      <button
        type='button'
        className='a-btn a-btn-icon p-0'
        onClick={this.handleContainerDelete}
      >
        <i className='ai ai-circle-exit a-danger ai-left' />
      </button>
    );
  }

  public renderNewGroupButton = (): JSX.Element => {
    if (this.props.baseContainer || !this.props.repeating) {
      return null;
    }
    const repeatingGroupCount = Object.keys(this.props.containers).filter((id) => {
      return this.props.containers[id].dataModelGroup === this.props.dataModelGroup;
    }).length;

    if (repeatingGroupCount - 1 !== this.props.index) {
      return null;
    }

    return (
      <button
        className={'a-btn a-btn-action'}
        onClick={this.handleAddNewGroup}
      >
        <i className={'ai ai-plus'} />
        <span>Legg til gruppe</span>
      </button>
    );
  }

  public renderFormComponent = (id: string, key: any): JSX.Element => {
    if (this.props.components[id].hidden && !this.props.designMode) {
      return null;
    }
    return (
      <FormComponentWrapper
        key={key}
        id={id}
        handleDataUpdate={this.handleComponentDataUpdate}
        formData={this.props.formData[this.props.components[id].dataModelBinding] ?
          this.props.formData[this.props.components[id].dataModelBinding] : ''}
      />
    );
  }

  public handleAddNewGroup = () => {
    const container: ICreateFormContainer = {
      repeating: this.props.repeating,
      dataModelGroup: this.props.dataModelGroup,
      index: this.props.index + 1,
    };

    FormDesignerActionDispatchers.addFormContainer(container, this.props.id);
  }
  public changeActiveFormContainer = (e: any) => {
    e.stopPropagation();
    FormDesignerActionDispatchers.addActiveFormContainer(this.props.id);
  }
  public toggleChange = () => {
    FormDesignerActionDispatchers.toggleFormContainerRepeat(this.props.id);
  }
}

const makeMapStateToProps = () => {
  const GetFormDataSelector = makeGetFormDataSelector();
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const GetDesignModeSelector = makeGetDesignModeSelector();
  const GetActiveFormContainer = makeGetActiveFormContainer();
  const mapStateToProps = (state: IAppState, props: IProvidedContainerProps): IContainerProps => {
    const containers = GetLayoutContainersSelector(state);
    const container = containers[props.id];
    const order = GetLayoutOrderSelector(state);
    return {
      id: props.id,
      index: container.index,
      itemOrder: order[props.id],
      components: GetLayoutComponentsSelector(state),
      containers,
      designMode: GetDesignModeSelector(state),
      repeating: container.repeating,
      formData: GetFormDataSelector(state, props, container.index),
      dataModelGroup: container.dataModelGroup,
      formContainerActive: GetActiveFormContainer(state, props),
    };
  };
  return mapStateToProps;
};

export const Container = connect(makeMapStateToProps)(ContainerComponent);
