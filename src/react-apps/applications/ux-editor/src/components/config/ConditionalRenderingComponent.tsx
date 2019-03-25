import * as React from 'react';
import { connect } from 'react-redux';
import * as uuid from 'uuid/v1'; // time
import { SelectDataModelComponent } from './SelectDataModelComponent';

export interface IConditionalRenderingComponentProps {
  connectionId?: any;
  cancelEdit: () => void;
  saveEdit: (updatedConnection: any) => void;
  ruleModelElements: IRuleModelFieldElement[];
  conditionalRendering: any;
  formLayoutComponents: IFormDesignerComponent;
  deleteConnection?: (connectionId: any) => void;
  formLayoutContainers: any;
  order: IFormLayoutOrder;
  language: any;
}

class ConditionalRendering extends React.Component<IConditionalRenderingComponentProps, any> {
  constructor(_props: any, _state: any) {
    super(_props, _state);
    const id = uuid();
    this.state = {
      selectedFunctionNr: null,
      connectionId: null,
      selectableActions: ['Show', 'Hide'],
      conditionalRendering: {
        selectedFunction: '',
        inputParams: '',
        selectedAction: '',
        selectedFields: {
          [id]: '',
        },
      },
    };
  }

  /**
   * Methods that maps a connection to the correct props if one opens an existing rule
   * and creates a new connection id if one is trying to create a new connection
   */
  public componentDidMount() {
    if (this.props.connectionId) {
      for (let i = 0; this.props.ruleModelElements.length - 1; i++) {
        // tslint:disable-next-line:max-line-length
        if (this.props.ruleModelElements[i].name === this.props.conditionalRendering[this.props.connectionId].selectedFunction) {
          this.setState({
            selectedFunctionNr: i,
          });
          break;
        }
      }
      this.setState({
        connectionId: this.props.connectionId,
        conditionalRendering: {
          ...this.props.conditionalRendering[this.props.connectionId],
        },
      });
    } else {
      this.setState({ connectionId: uuid() });
    }
  }

  /**
   * Methods that handles the saving of a conditional rendering rule
   */
  public handleSaveEdit = (): void => {
    const connectionToSave = {
      [this.state.connectionId]: {
        ...this.state.conditionalRendering,
      },
    };
    this.props.saveEdit(connectionToSave);
  }

  /**
   * Methods that updates which function is selected and is to be used when running the conditional rendering rule
   */
  public handleSelectedMethodChange = (e: any): void => {
    const nr = e.target.selectedIndex - 1 < 0 ? null : e.target.selectedIndex - 1;
    const value = e.target.value;
    this.setState({
      selectedFunctionNr: nr,
      conditionalRendering: {
        ...this.state.conditionalRendering,
        selectedFunction: value,
      },
    });
  }

  /**
   * Methods that updates which action is selected and is to be used when running the conditional rendering rule
   */
  public handleActionChange = (e: any): void => {
    const value = e.target.value;
    this.setState({
      conditionalRendering: {
        ...this.state.conditionalRendering,
        selectedAction: value,
      },
    });
  }

  /**
   * Methods that updates the input param connections to the datamodel
   */
  public handleParamDataChange = (paramName: any, value: any): void => {
    this.setState({
      conditionalRendering: {
        ...this.state.conditionalRendering,
        inputParams: {
          ...this.state.conditionalRendering.inputParams,
          [paramName]: value,
        },
      },
    });
  }

  /**
   * Methods that updates which layout components that should be affected when the conditional rendering rule runs
   */
  public handleFieldMappingChange = (id: any, e: any) => {
    const value = e.target.value;
    this.setState({
      ...this.state,
      conditionalRendering: {
        ...this.state.conditionalRendering,
        selectedFields: {
          ...this.state.conditionalRendering.selectedFields,
          [id]: value,
        },
      },
    });
  }

  /**
   * Methods that removes a layout component from the pool of layout
   * compoenents that will be affected by the conditional rendering rule
   */
  public removeFieldMapping = (removeId: any) => {
    this.setState({
      ...this.state,
      conditionalRendering: {
        ...this.state.conditionalRendering,
        selectedFields: Object.keys(this.state.conditionalRendering.selectedFields)
          .filter((id: any) => id !== removeId)
          .reduce((newSelectedFields, item) => {
            return {
              ...newSelectedFields, [item]: this.state.conditionalRendering.selectedFields[item],
            };
          },
            {}),
      },
    });
  }

  /**
   * Methods that adds a new layout component to the GUI that will later be put in the pool of layout
   * compoenents that will be affected by the conditional rendering rule.
   * On init this field is empty and not mapped to a layout compoenent
   */
  public addNewField = () => {
    const newId = uuid();
    this.setState({
      ...this.state,
      conditionalRendering: {
        ...this.state.conditionalRendering,
        selectedFields: {
          ...this.state.conditionalRendering.selectedFields,
          [newId]: '',
        },
      },
    });
  }

  public handleDeleteConnection = () => {
    this.props.deleteConnection(this.props.connectionId);
  }

  public renderConditionalRenderingTargetComponentOption = (id: string): JSX.Element => {
    return (
      <option key={id} value={id}>
        {`${this.props.formLayoutComponents[id].component} (id=${id})`}
      </option>
    );
  }

  public renderCondtionalRenderingTargetContainerOptions = (id: string, baseContainer?: boolean): JSX.Element[] => {
    const options: JSX.Element[] = [];
    if (!this.props.order[id]) {
      return options;
    }
    if (!baseContainer) {
      options.push(
        <option key={id} value={id}>
          {`Container (id=${id})`}
        </option>,
      );
    }
    this.props.order[id].forEach((key) => {
      if (this.props.formLayoutComponents[key]) {
        const option = this.renderConditionalRenderingTargetComponentOption(key);
        options.push(option);
      } else {
        // A container can have components and sub-containers
        const containerOptions = this.renderCondtionalRenderingTargetContainerOptions(key);
        containerOptions.forEach((option) => {
          options.push(option);
        });
      }
    });
    return options;
  }

  public renderCondtionalRenderingTargetOptions = (): JSX.Element[] => {
    const baseContainerKey = Object.keys(this.props.order)[0];
    if (!baseContainerKey) {
      return null;
    }
    return this.renderCondtionalRenderingTargetContainerOptions(baseContainerKey, true);
  }

  public render(): JSX.Element {
    const selectedMethod = this.state.conditionalRendering.selectedFunction;
    const selectedMethodNr = this.state.selectedFunctionNr;
    return (
      <div className='modal-content'>
        <div className='modal-header a-modal-header'>
          <div className='a-iconText a-iconText-background a-iconText-large'>
            <div className='a-iconText-icon'>
              <i className='fa fa-corp a-icon' />
            </div>
            <h1 className='a-iconText-text mb-0'>
              <span className='a-iconText-text-large'>
                {this.props.language.ux_editor.modal_configure_conditional_rendering_header}
              </span>
            </h1>
          </div>
        </div>
        <div className='modal-body a-modal-body'>
          <div className='form-group a-form-group'>
            <label htmlFor='selectConditionalRule' className='a-form-label'>
              {this.props.language.ux_editor.modal_configure_conditional_rendering_helper}
            </label>
            <select
              name='selectConditionalRule'
              onChange={this.handleSelectedMethodChange}
              value={selectedMethod}
              className='custom-select a-custom-select'
              id='selectConditionalRule'
            >
              <option value={''}>
                {this.props.language.general.choose_method}
              </option>
              {this.props.ruleModelElements.map((funcObj: any, i: any) => {
                return (
                  <option key={funcObj.name} value={funcObj.name}>{funcObj.name}</option>
                );
              })}
            </select>
          </div>
          {this.state.conditionalRendering.selectedFunction ?
            <>
              <div className='form-group a-form-group mt-2'>
                <h2 className='a-h4'>
                  {this.props.language.ux_editor.modal_configure_conditional_rendering_configure_input_header}
                </h2>
                {Object.keys(this.props.ruleModelElements[selectedMethodNr].inputs).map(
                  (key: any, index: any) => {
                    const paramName = key;
                    return (
                      <div className='row align-items-center mb-1' key={index}>
                        <div className='col-3 col'>
                          <div className='form-group a-form-group mt-1 disabled'>
                            <label className='a-form-label' htmlFor={paramName}>
                              {this.props.language.
                                ux_editor.modal_configure_conditional_rendering_configure_input_param_helper}
                            </label>
                            <input
                              id={paramName}
                              name={paramName}
                              type='text'
                              className='form-control'
                              value={this.props.ruleModelElements[selectedMethodNr].inputs[key]}
                              width={10}
                              disabled={true}
                            />
                          </div>
                        </div>
                        <div className='col-9 col'>
                          <SelectDataModelComponent
                            onDataModelChange={this.handleParamDataChange.bind(null, paramName)}
                            selectedElement={this.state.conditionalRendering.inputParams[paramName]}
                            hideRestrictions={true}
                            language={this.props.language}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className='form-group a-form-group mt-2'>
                <h2 className='a-h4'>
                  {this.props.language.ux_editor.modal_configure_conditional_rendering_configure_output_header}
                </h2>
                <div className='row align-items-center mb-1'>
                  <div className='col'>
                    <label className='a-form-label' htmlFor={'select_action'}>
                      {this.props.language.
                        ux_editor.modal_configure_conditional_rendering_configure_output_action_helper}
                    </label>
                    <select
                      id={'select_action'}
                      value={this.state.conditionalRendering.selectedAction}
                      onChange={this.handleActionChange}
                      className='custom-select a-custom-select'
                    >
                      <option value={''}>
                        {this.props.language.general.action}
                      </option>
                      {this.state.selectableActions.map((value: string, key: any) => {
                        return (
                          <option key={key} value={value}>{value}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <p className='mt-2'>
                  {this.props.language.ux_editor.modal_configure_conditional_rendering_configure_output_field_helper}
                </p>
                {Object.keys(this.state.conditionalRendering.selectedFields).map((key: any) => {
                  return (
                    <div className='row align-items-center' key={key}>
                      <div className='col-11 col'>
                        <select
                          name={key}
                          onChange={this.handleFieldMappingChange.bind(null, key)}
                          value={this.state.conditionalRendering.selectedFields[key]}
                          className='custom-select a-custom-select mb-1'
                        >
                          <option value={''}>
                            {this.props.language.general.select_field}
                          </option>
                          {
                            this.renderCondtionalRenderingTargetOptions()
                          }
                        </select>
                      </div>
                      <div className='col-1 col'>
                        <button
                          type='button'
                          className='a-btn a-btn-icon'
                          onClick={this.removeFieldMapping.bind(null, key)}
                        >
                          <i className='fa fa-circle-exit a-danger ai-left' />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className='align-items-center row'>
                  <div className='col-6 col'>
                    <button
                      type='button'
                      className='a-btn'
                      onClick={this.addNewField}
                    >
                      {this.props.language.ux_editor.
                        modal_configure_conditional_rendering_configure_add_new_field_mapping}
                    </button>
                  </div>
                </div>
              </div>
            </>
            :
            null}
          <div className='row mt-3'>
            <div className='col'>
              {this.state.conditionalRendering.selectedFunction ?
                <button onClick={this.handleSaveEdit} type='submit' className='a-btn a-btn-success mr-2'>
                  {this.props.language.general.save}
                </button>
                : null
              }
              {this.props.connectionId ?
                <button type='button' className='a-btn a-btn-danger mr-2' onClick={this.handleDeleteConnection}>
                  {this.props.language.general.delete}
                </button>
                : null
              }
              <a onClick={this.props.cancelEdit}>
                {this.props.language.general.cancel}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: IAppState, props: any): any => {
  return {
    ruleModelElements: state.appData.ruleModel.model.filter((key: any) => key.type === 'condition'),
    conditionalRendering: state.serviceConfigurations.conditionalRendering,
    selectedFunction: props.selectedFunction,
    formLayoutComponents: state.formDesigner.layout.components,
    formLayoutContainers: state.formDesigner.layout.containers,
    order: state.formDesigner.layout.order,
    language: state.appData.language.language,
  };
};

export const ConditionalRenderingComponent = connect(mapStateToProps)(ConditionalRendering);
