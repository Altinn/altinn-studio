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
import {
  makeGetActiveFormContainer,
  makeGetLayoutComponentsSelector,
  makeGetLayoutContainerOrder,
  makeGetLayoutContainersSelector,
} from '../selectors/getLayoutData';
import '../styles/index.css';
// import DroppableDraggableComponent from './DroppableDraggableComponent';
// import DroppableDraggableContainer from './DroppableDraggableContainer';

export interface IProvidedContainerProps {
  id: string;
  index?: number;
  baseContainer?: boolean;
  items?: string[];
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
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
  activeList: any[];
  language: any;
}

export interface IContainerState {
  itemOrder: any;
  currentlyDragging: boolean;
  activeList: any[];
}

export class ContainerComponent extends React.Component<IContainerProps, IContainerState> {
  public static getDerivedStateFromProps(nextProps: IContainerProps, prevState: IContainerState) {
    if (prevState.currentlyDragging) {
      return {
        ...prevState,
      };
    }
    return {
      ...nextProps,
    };
  }

  constructor(_props: IContainerProps) {
    super(_props);

    this.state = {
      itemOrder: _props.itemOrder,
      currentlyDragging: false,
      activeList: [],
    };
  }

  public handleContainerDelete = (e: any) => {
    FormDesignerActionDispatchers.deleteFormContainer(this.props.id, this.props.index);
    e.stopPropagation();
  }

  public handleComponentDataUpdate = (
    id: string,
    dataModelElement: IDataModelFieldElement,
    callbackValue: any,
  ): void => {
    const dataBindingName = this.isRepeating() ? dataModelElement.dataBindingName.replace(this.props.dataModelGroup,
      this.props.dataModelGroup + `[${this.props.index}]`) : dataModelElement.dataBindingName;
    FormFillerActionDispatchers.updateFormData(
      id,
      callbackValue,
      dataModelElement,
      dataBindingName,
    );
    const component = this.props.components[id];
    if (component && component.triggerValidation) {
      const { org, app, instanceId } = window as IAltinnWindow;
      FormFillerActionDispatchers.runSingleFieldValidation(
        `${window.location.origin}/${org}/${app}/api/${instanceId}`,
        dataBindingName,
      );
    }
    const repeatingContainerId = this.isRepeating() ? this.props.id : null;
    ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun(repeatingContainerId);
    RuleConnectionActionDispatchers.checkIfRuleShouldRun(id, dataModelElement, callbackValue, repeatingContainerId);
    ApiActionDispatchers.checkIfApiShouldFetch(id, dataModelElement, callbackValue, this.props.repeating,
      this.props.dataModelGroup, this.props.index);
  }

  public isRepeating = (): boolean => {
    return (this.props.index || this.props.index > -1) && this.props.dataModelGroup && this.props.repeating;
  }

  public renderContent = (ref?: any): JSX.Element => {
    const className: string = this.props.baseContainer ? 'col-12' :
      this.props.formContainerActive ? 'col-12 a-btn-action a-bgBlueLighter cursorPointer' :
        'col-12 a-btn-action cursorPointer';
    return (
      <div
        className={className}
        onClick={this.changeActiveFormContainer}
        ref={ref}
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

        {!this.props.itemOrder.length ?
          this.props.designMode ? this.renderContainerPlaceholder() : null :
          this.props.itemOrder.map((id: string, index: number) => (
            this.props.components[id] ?
              this.renderFormComponent(id, index) :
              this.props.containers[id] ?
                this.renderContainer(id, index)
                : null
          ))
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
      </div>
    );
  }

  public render() {
    return (
      <div className={'col-12'}>
        {this.renderContent()}
        {this.renderNewGroupButton()}
      </div>
    );
  }

  public renderContainerPlaceholder = () => {
    const DroppableDraggableComponent = require('./DroppableDraggableComponent').default;
    return (
      <DroppableDraggableComponent
        onDropComponent={this.props.onDropComponent}
        onMoveComponent={this.props.onMoveComponent}
        onDropContainer={this.props.onDropContainer}
        onMoveContainer={this.props.onMoveContainer}
        canDrag={false}
        id={'placeholder'}
        index={0}
        containerId={this.props.id}
      >
        {this.props.language.ux_editor.container_empty}
      </DroppableDraggableComponent>
    );
  }

  public renderContainer = (id: string, index: number): JSX.Element => {
    return null;
    /*
      Commented out since we're disabling containers until design is done.
      https://github.com/Altinn/altinn-studio/issues/451

      if (this.props.containers[id].hidden && !this.props.designMode) {
      return null;
    }
    if (this.props.designMode) {
      const DroppableDraggableContainer = require('./DroppableDraggableContainer').default;
      return (
        <DroppableDraggableContainer
          id={id}
          index={index}
          baseContainer={false}
          parentContainerId={this.props.id}
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
            baseContainer={false}
            onDropComponent={this.props.onDropContainer}
            onMoveComponent={this.props.onMoveComponent}
            onDropContainer={this.props.onDropContainer}
            onMoveContainer={this.props.onMoveContainer}
          />
        </DroppableDraggableContainer>
      );
    }
    return (
      <Container
        id={id}
        key={`${id}`}
        baseContainer={false}
      />
    );
    */
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
        <i className='fa fa-circle-exit a-danger ai-left' />
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
        <i className={'fa fa-plus'} />
        <span>
          {this.props.language.ux_editor.repeating_group_add}
        </span>
      </button>
    );
  }

  public handleActiveListChange = (list: any[]) => {
    this.setState({
      activeList: list,
    });
  }

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    if (this.props.components[id].hidden && !this.props.designMode) {
      return null;
    }
    const activeListIndex = this.props.activeList.findIndex((listItem: any) => listItem.id === id);
    if (this.props.designMode) {
      const DroppableDraggableComponent = require('./DroppableDraggableComponent').default;
      let canDrag: boolean = true;
      for (const activeItem of this.state.activeList) {
        if (activeItem.id === id) {
          canDrag = false;
        }
      }
      return (
        <DroppableDraggableComponent
          canDrag={canDrag}
          id={id}
          index={index}
          key={index}
          containerId={this.props.id}
          onDropComponent={this.props.onDropContainer}
          onMoveComponent={this.props.onMoveComponent}
          onDropContainer={this.props.onDropContainer}
          onMoveContainer={this.props.onMoveContainer}
        >
          <FormComponentWrapper
            key={index}
            id={id}
            activeList={this.props.activeList}
            firstInActiveList={activeListIndex >= 0 ? this.props.activeList[activeListIndex].firstInActiveList : true}
            lastInActiveList={activeListIndex >= 0 ? this.props.activeList[activeListIndex].lastInActiveList : true}
            handleDataUpdate={this.handleComponentDataUpdate}
            formData={this.getFormData(id)}
            sendListToParent={this.handleActiveListChange}
            singleSelected={this.props.activeList.length === 1}
          />
        </DroppableDraggableComponent>
      );
    }
    return (
      <FormComponentWrapper
        key={index}
        id={id}
        activeList={this.props.activeList}
        firstInActiveList={activeListIndex >= 0 ? this.props.activeList[activeListIndex].firstInActiveList : true}
        lastInActiveList={activeListIndex >= 0 ? this.props.activeList[activeListIndex].lastInActiveList : true}
        handleDataUpdate={this.handleComponentDataUpdate}
        formData={this.getFormData(id)}
        sendListToParent={this.handleActiveListChange}
        singleSelected={this.props.activeList.length === 1}
      />
    );
  }

  public getFormData = (id: string): string | {} => {
    if (!this.props.components[id].dataModelBindings ||
      Object.keys(this.props.components[id].dataModelBindings).length === 0) {
      return '';
    }
    const valueArr: { [id: string]: string } = {};
    for (const dataBindingKey in this.props.components[id].dataModelBindings) {
      if (!dataBindingKey) {
        continue;
      }
      valueArr[dataBindingKey] = this.props.formData[this.props.components[id].dataModelBindings[dataBindingKey]];
    }
    if (Object.keys(valueArr).indexOf('simpleBinding') >= 0) {
      // Simple component
      return valueArr.simpleBinding;
    } else {
      // Advanced component
      return valueArr;
    }
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

const makeMapStateToProps = () => {
  const GetFormDataSelector = makeGetFormDataSelector();
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetDesignModeSelector = makeGetDesignModeSelector();
  const GetActiveFormContainer = makeGetActiveFormContainer();
  const GetContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutContainerOrder = makeGetLayoutContainerOrder();
  const mapStateToProps = (state: IAppState, props: IProvidedContainerProps): IContainerProps => {
    const containers = GetContainersSelector(state);
    const container = containers[props.id];
    const itemOrder = GetLayoutContainerOrder(state, props.id);
    return {
      activeList: state.formDesigner.layout.activeList,
      dataModelGroup: container.dataModelGroup,
      repeating: container.repeating,
      formContainerActive: GetActiveFormContainer(state, props),
      designMode: GetDesignModeSelector(state),
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      language: state.appData.language.language,
      formData: GetFormDataSelector(state, props, container.index),
      itemOrder: !props.items ? itemOrder : props.items,
      id: props.id,
      index: props.index,
      baseContainer: props.baseContainer,
      onMoveComponent: props.onMoveComponent,
      onDropComponent: props.onDropComponent,
      onMoveContainer: props.onMoveContainer,
      onDropContainer: props.onDropContainer,
    };
  };
  return mapStateToProps;
};

export const Container = connect(makeMapStateToProps)(ContainerComponent);
