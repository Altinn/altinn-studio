import * as React from 'react';
import { connect } from 'react-redux';
import ApiActionDispatchers from '../actions/apiActions/apiActionDispatcher';
import ConditionalRenderingActionDispatcher from '../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import FormFillerActionDispatchers from '../actions/formFillerActions/formFillerActionDispatcher';
import RuleConnectionActionDispatchers from '../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import { FormComponentWrapper } from '../components/FormComponent';
import { SwitchComponent } from '../components/widget/SwitchComponent';
import '../styles/index.css';
import DroppableDraggableComponent from './DroppableDraggableComponent';
import DroppableDraggableContainer from './DroppableDraggableContainer';

export interface IProvidedContainerProps {
  id: string;
  index?: number;
  baseContainer?: boolean;
  items: string[];
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
}

export interface IContainerProps extends IProvidedContainerProps {
  dataModelGroup: any;
  repeating: boolean;
  formContainerActive: boolean;
  designMode: boolean;
  components: any;
  containers: any;
  language: any;
  formData: any;
  itemOrder: any;
}

export class ContainerComponent extends React.Component<IContainerProps, null> {
  public handleContainerDelete = (e: any) => {
    FormDesignerActionDispatchers.deleteFormContainer(this.props.id);
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
    const repeatingContainerId = this.isRepeating() ? this.props.id : null;

    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun(repeatingContainerId);
    RuleConnectionActionDispatchers.checkIfRuleShouldRun(id, dataModelElement, callbackValue, repeatingContainerId);
    ApiActionDispatchers.checkIfApiShouldFetch(id, dataModelElement, callbackValue, this.props.repeating,
      this.props.dataModelGroup, this.props.index);
  }

  public isRepeating = (): boolean => {
    return (this.props.index || this.props.index > -1) && this.props.dataModelGroup && this.props.repeating;
  }

  public render() {
    const className: string = this.props.baseContainer ? 'col-12' :
      this.props.formContainerActive ? 'col-12 a-btn-action a-bgBlueLighter cursorPointer' :
        'col-12 a-btn-action cursorPointer';
    if (this.props.baseContainer) {
      return (
        <DroppableDraggableContainer
          id={this.props.id}
          baseContainer={true}
          onDropContainer={this.props.onDropContainer}
          onMoveContainer={this.props.onMoveComponent}
          canDrag={false}
        >
          <div
            className={className}
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
            {this.props.items.length > 0 ?
              this.props.items.map((id: string, index: number) => (
                this.props.components[id] ?
                  this.renderFormComponent(id, index) :
                  this.props.containers[id] ?
                    this.renderContainer(id, index)
                    : null
              )) : this.renderContainerPlaceholder()
            }
            {
              !this.props.designMode && this.props.index !== 0 && !this.props.baseContainer &&
              <button
                className={'a-btn a-btn-action offset-10'}
                onClick={this.handleContainerDelete}
              >
                <span>{this.props.language.ux_editor.repeating_group_delete}</span>
              </button>
            }
            {!this.props.designMode && this.renderNewGroupButton()}
          </div>
        </DroppableDraggableContainer>
      );
    }
    return (
      <div>
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
        {this.props.items.length ?
          this.props.items.map((id: string, index: number) => (
            this.props.components[id] ?
              this.renderFormComponent(id, index) :
              this.props.containers[id] ?
                this.renderContainer(id, index)
                : null
          )) : this.renderContainerPlaceholder()
        }
        {
          !this.props.designMode && this.props.index !== 0 && !this.props.baseContainer &&
          <button
            className={'a-btn a-btn-action offset-10'}
            onClick={this.handleContainerDelete}
          >
            <span>{this.props.language.ux_editor.repeating_group_delete}</span>
          </button>
        }
        {!this.props.designMode && this.renderNewGroupButton()}
      </div>
    );
  }

  public renderContainerPlaceholder = () => {
    return (
      <DroppableDraggableComponent
        onDropComponent={this.props.onDropComponent}
        onMoveComponent={this.props.onMoveComponent}
        onDropContainer={this.props.onDropComponent}
        onMoveContainer={this.props.onMoveContainer}
        id={'placeholder'}
        index={0}
        containerId={this.props.id}
      >
        This is empty, drag something here
      </DroppableDraggableComponent>
    )
  }

  public renderContainer = (id: string, index: number) => {
    if (this.props.containers[id].hidden && !this.props.designMode) {
      return null;
    }
    if (this.props.designMode) {
      return (
        <DroppableDraggableContainer
          id={id}
          baseContainer={false}
          canDrag={true}
          onDropComponent={this.props.onDropComponent}
          onMoveComponent={this.props.onMoveComponent}
          onDropContainer={this.props.onDropComponent}
          onMoveContainer={this.props.onMoveContainer}
        >
          <Container
            id={id}
            index={index}
            items={this.props.itemOrder[id]}
            baseContainer={true}
            onDropComponent={this.props.onDropContainer}
            onMoveComponent={this.props.onMoveComponent}
            onDropContainer={this.props.onDropContainer}
            onMoveContainer={this.props.onMoveContainer}
          />
        </DroppableDraggableContainer>
      );
    } else {
      return (
        <Container
          id={id}
          index={index}
          items={this.props.itemOrder[this.props.id]}
        />
      );
    }
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
        <span>
          {this.props.language.ux_editor.repeating_group_add}
        </span>
      </button>
    );
  }

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    if (this.props.components[id].hidden && !this.props.designMode) {
      return null;
    }

    if (this.props.designMode) {
      return (
        <DroppableDraggableComponent
          id={id}
          index={index}
          containerId={this.props.id}
          onDropComponent={this.props.onDropContainer}
          onMoveComponent={this.props.onMoveComponent}
          onDropContainer={this.props.onDropContainer}
          onMoveContainer={this.props.onMoveContainer}
        >
          <FormComponentWrapper
            key={index}
            id={id}
            handleDataUpdate={this.handleComponentDataUpdate}
            formData={this.props.formData[this.props.components[id].dataModelBinding] ?
              this.props.formData[this.props.components[id].dataModelBinding] : ''}
          />
        </DroppableDraggableComponent>
      );
    }
    return (
      <FormComponentWrapper
        key={index}
        id={id}
        handleDataUpdate={this.handleComponentDataUpdate}
        formData={this.props.formData[this.props.components[id].dataModelBinding] ?
          this.props.formData[this.props.components[id].dataModelBinding] : ''}
      />
    );
  }

  public handleAddNewGroup = () => {
    FormDesignerActionDispatchers.createRepeatingGroup(this.props.id);
  }

  public changeActiveFormContainer = (e: any) => {
    e.stopPropagation();
  }
  public toggleChange = () => {
    FormDesignerActionDispatchers.toggleFormContainerRepeat(this.props.id);
  }
}

const makeMapStateToProps = (state: IAppState, props: IProvidedContainerProps) => ({
  dataModelGroup: state.formDesigner.layout.containers[props.id].dataModelGroup,
  repeating: state.formDesigner.layout.containers[props.id].repeating,
  formContainerActive: state.formDesigner.layout.activeContainer === props.id,
  designMode: state.appData.appConfig.designMode,
  components: state.formDesigner.layout.components,
  containers: state.formDesigner.layout.containers,
  language: state.appData.language.language,
  formData: state.formFiller.formData,
  itemOrder: state.formDesigner.layout.order,
  id: props.id,
  index: props.index,
  baseContainer: props.baseContainer,
  items: props.items,
  onMoveComponent: props.onMoveComponent,
  onDropComponent: props.onDropComponent,
  onMoveContainer: props.onMoveContainer,
  onDropContainer: props.onDropContainer,
});

export const Container = connect(makeMapStateToProps)(ContainerComponent);
