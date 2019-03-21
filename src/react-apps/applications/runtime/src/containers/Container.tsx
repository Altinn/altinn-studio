import * as React from 'react';
import { connect } from 'react-redux';
import { FormComponentWrapper } from '../components/FormComponent';
// import '../styles/index.css';
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

  public handleComponentDataUpdate = (
    id: string,
    dataModelElement: IDataModelFieldElement,
    callbackValue: any,
  ): void => {
    const dataBindingName = this.isRepeating() ? dataModelElement.DataBindingName.replace(this.props.dataModelGroup,
      this.props.dataModelGroup + `[${this.props.index}]`) : dataModelElement.DataBindingName;
    /*ormFillerActionDispatchers.updateFormData(
      id,
      callbackValue,
      dataModelElement,
      dataBindingName,
    );*/
    const component = this.props.components[id];
    if (component && component.triggerValidation) {
      const altinnWindow: IAltinnWindow = window as IAltinnWindow;
      const { org, service, instanceId, reportee } = altinnWindow;
      // TODO: implement this
      /*
      FormFillerActionDispatchers.runSingleFieldValidation(
        `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/${instanceId}`,
        dataBindingName,
      );
    }
    const repeatingContainerId = this.isRepeating() ? this.props.id : null;
    /*ConditionalRenderingActionDispatcher.checkIfConditionalRulesShouldRun(repeatingContainerId);
    RuleConnectionActionDispatchers.checkIfRuleShouldRun(id, dataModelElement, callbackValue, repeatingContainerId);
    ApiActionDispatchers.checkIfApiShouldFetch(id, dataModelElement, callbackValue, this.props.repeating,
      this.props.dataModelGroup, this.props.index);*/
    }
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
        ref={ref}
      >
        {!this.props.itemOrder.length ? null :
          this.props.itemOrder.map((id: string, index: number) => (
            this.props.components[id] ?
              this.renderFormComponent(id, index) :
              this.props.containers[id] ?
                this.renderContainer(id, index)
                : null
          ))
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

  public handleActiveListChange = (list: any[]) => {
    this.setState({
      activeList: list,
    });
  }

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    if (this.props.components[id].hidden && !this.props.designMode) {
      return null;
    }
    return (
      <FormComponentWrapper
        key={index}
        id={id}
        handleDataUpdate={this.handleComponentDataUpdate}
        formData={this.getFormData(id)}
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
    // FormDesignerActionDispatchers.createRepeatingGroup(this.props.id);
  }
}

const makeMapStateToProps = () => {
  const mapStateToProps = (state: IRuntimeStore, props: IProvidedContainerProps): IContainerProps => {
    return null; /*{
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
    };*/
  };
  return mapStateToProps;
};

export const Container = connect(makeMapStateToProps)(ContainerComponent);
