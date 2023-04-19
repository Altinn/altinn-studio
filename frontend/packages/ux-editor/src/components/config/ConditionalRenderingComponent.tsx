import React from 'react';
import { connect } from 'react-redux';
import { v1 as uuidv1 } from 'uuid';
import Modal from 'react-modal';
import { getComponentTitleByComponentType } from '../../utils/language';
import { SelectDataModelComponent } from './SelectDataModelComponent';
import type {
  IAppState,
  IFormComponent,
  IFormDesignerComponents, IFormDesignerContainers,
  IFormLayoutOrder,
  IRuleModelFieldElement,
} from '../../types/global';
import classes from './ConditionalRenderingComponent.module.css';
import { withTranslation } from 'react-i18next';
import { ComponentType } from '../index';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

export interface IConditionalRenderingComponentProps {
  connectionId?: any;
  cancelEdit: () => void;
  saveEdit: (updatedConnection: any) => void;
  ruleModelElements: IRuleModelFieldElement[];
  conditionalRendering: any;
  formLayoutComponents: IFormDesignerComponents;
  deleteConnection?: (connectionId: any) => void;
  formLayoutContainers: IFormDesignerContainers;
  order: IFormLayoutOrder;
  t: any;
}

class ConditionalRendering extends React.Component<IConditionalRenderingComponentProps, any> {
  constructor(props: IConditionalRenderingComponentProps) {
    super(props);
    const id = uuidv1();
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
        // eslint-disable-next-line max-len
        if (
          this.props.ruleModelElements[i].name ===
          this.props.conditionalRendering[this.props.connectionId].selectedFunction
        ) {
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
      this.setState({ connectionId: uuidv1() });
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
  };

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
  };

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
  };

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
  };

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
  };

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
              ...newSelectedFields,
              [item]: this.state.conditionalRendering.selectedFields[item],
            };
          }, {}),
      },
    });
  };

  /**
   * Methods that adds a new layout component to the GUI that will later be put in the pool of layout
   * compoenents that will be affected by the conditional rendering rule.
   * On init this field is empty and not mapped to a layout compoenent
   */
  public addNewField = () => {
    const newId = uuidv1();
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
  };

  public handleDeleteConnection = () => {
    this.props.deleteConnection(this.props.connectionId);
  };

  public renderConditionalRenderingTargetComponentOption = (id: string): JSX.Element => {
    const component: IFormComponent = this.props.formLayoutComponents[id];
    const labelText = getComponentTitleByComponentType(component.type, this.props.t);
    return (
      <option key={id} value={id}>
        {`${labelText} (${id})`}
      </option>
    );
  };

  public renderCondtionalRenderingTargetContainerOptions = (
    id: string,
    baseContainer?: boolean
  ): JSX.Element[] => {
    const options: JSX.Element[] = [];
    if (!this.props.order[id]) {
      return options;
    }
    if (!baseContainer) {
      const name = getComponentTitleByComponentType(ComponentType.Group, this.props.t);
      options.push(
        <option key={id} value={id}>
          {`${name} (${id})`}
        </option>
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
  };

  public renderCondtionalRenderingTargetOptions = (): JSX.Element[] => {
    const options: JSX.Element[] = [];
    Object.keys(this.props.order).forEach((key) => {
      const containerKey = Object.keys(this.props.order)[0];
      const isBaseContainer = containerKey === BASE_CONTAINER_ID;
      const containerOptions = this.renderCondtionalRenderingTargetContainerOptions(
        key,
        isBaseContainer
      );
      containerOptions.forEach((option) => {
        options.push(option);
      });
    });
    return options;
  };

  public render(): JSX.Element {
    const selectedMethod = this.state.conditionalRendering.selectedFunction;
    const selectedMethodNr = this.state.selectedFunctionNr;
    return (
      <Modal
        isOpen={true}
        onRequestClose={() => {}}
        className={classes.modalBody}
        ariaHideApp={false}
        overlayClassName={classes.reactModalOverlay}
      >
        <div className={classes.modalHeader}>
          <i className='fa fa-corp' />
          <h1 className={classes.modalHeaderTitle}>
            {this.props.t('ux_editor.modal_configure_conditional_rendering_header')}
          </h1>
        </div>

        <div className={classes.modalBodyContent}>
          <div className={classes.formGroup}>
            <label htmlFor='selectConditionalRule' className={classes.label}>
              {this.props.t('ux_editor.modal_configure_conditional_rendering_helper')}
            </label>
            <select
              name='selectConditionalRule'
              onChange={this.handleSelectedMethodChange}
              value={selectedMethod}
              className={classes.customSelect}
              id='selectConditionalRule'
              style={{ fontSize: '16px' }}
            >
              <option value=''>{this.props.t('general.choose_method')}</option>
              {this.props.ruleModelElements.map((funcObj: any) => {
                return (
                  <option key={funcObj.name} value={funcObj.name}>
                    {funcObj.name}
                  </option>
                );
              })}
            </select>
          </div>
          {this.state.conditionalRendering.selectedFunction ? (
            <>
              <div>
                <h2 className={classes.subTitle}>
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_input_header'
                  )}
                </h2>
                {Object.keys(this.props.ruleModelElements[selectedMethodNr].inputs).map(
                  (key: any) => {
                    const paramName = key;
                    return (
                      <>
                        <label className={classes.label} htmlFor={paramName}>
                          {this.props.t(
                            'ux_editor.modal_configure_conditional_rendering_configure_input_param_helper'
                          )}
                        </label>
                        <div className={classes.configureInputParamsContainer} key={key}>
                          <input
                            id={paramName}
                            name={paramName}
                            type='text'
                            className={classes.inputType}
                            value={this.props.ruleModelElements[selectedMethodNr].inputs[key]}
                            width={10}
                            disabled={true}
                          />

                          <div>
                            <SelectDataModelComponent
                              onDataModelChange={this.handleParamDataChange.bind(null, paramName)}
                              selectedElement={
                                this.state.conditionalRendering.inputParams[paramName]
                              }
                              hideRestrictions={true}
                            />
                          </div>
                        </div>
                      </>
                    );
                  }
                )}
              </div>
              <div>
                <h2 className={classes.subTitle}>
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_output_header'
                  )}
                </h2>
                <div className={classes.selectActionContainer}>
                  <label className={classes.label} htmlFor='select_action'>
                    {this.props.t(
                      'ux_editor.modal_configure_conditional_rendering_configure_output_action_helper'
                    )}
                  </label>
                  <select
                    id='select_action'
                    value={this.state.conditionalRendering.selectedAction}
                    onChange={this.handleActionChange}
                    className={classes.customSelect}
                    style={{ fontSize: '16px' }}
                  >
                    <option value=''>{this.props.t('general.action')}</option>
                    {this.state.selectableActions.map((value: string) => {
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p>
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_output_field_helper'
                  )}
                </p>
                {Object.keys(this.state.conditionalRendering.selectedFields).map((key: any) => {
                  return (
                    <div className={classes.chooseComponentContainer} key={key}>
                      <select
                        name={key}
                        onChange={this.handleFieldMappingChange.bind(null, key)}
                        value={this.state.conditionalRendering.selectedFields[key]}
                        className={classes.customSelect}
                        style={{ fontSize: '16px' }}
                      >
                        <option value=''>{this.props.t('general.select_component')}</option>
                        {this.renderCondtionalRenderingTargetOptions()}
                      </select>

                      <button
                        type='button'
                        className={classes.deleteFieldButton}
                        onClick={this.removeFieldMapping.bind(null, key)}
                      >
                        <i className='fa fa-circle-exit a-danger ai-left' />
                      </button>
                    </div>
                  );
                })}
                <button type='button' className={classes.addFieldButton} onClick={this.addNewField}>
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_add_new_field_mapping'
                  )}
                </button>
              </div>
            </>
          ) : null}
          <div className={classes.buttonsContainer}>
            {this.state.conditionalRendering.selectedFunction ? (
              <button onClick={this.handleSaveEdit} type='submit' className={classes.saveButton}>
                {this.props.t('general.save')}
              </button>
            ) : null}
            {this.props.connectionId ? (
              <button
                type='button'
                className={classes.dangerButton}
                onClick={this.handleDeleteConnection}
              >
                {this.props.t('general.delete')}
              </button>
            ) : null}
            <button className={classes.cancelButton} onClick={this.props.cancelEdit}>
              {this.props.t('general.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}

const mapStateToProps = (state: IAppState, props: any): any => {
  return {
    ruleModelElements: state.appData.ruleModel.model.filter((key: any) => key.type === 'condition'),
    conditionalRendering: state.serviceConfigurations.conditionalRendering,
    selectedFunction: props.selectedFunction,
  };
};

export const ConditionalRenderingComponent = withTranslation()(
  connect(mapStateToProps)(ConditionalRendering)
);
