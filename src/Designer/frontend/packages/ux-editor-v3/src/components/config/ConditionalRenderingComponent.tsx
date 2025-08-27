import React, { Fragment } from 'react';
import { v1 as uuidv1 } from 'uuid';
import { getComponentTitleByComponentType } from '../../utils/language';
import { SelectDataModelComponent } from './SelectDataModelComponent';
import type {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IRuleModelFieldElement,
} from '../../types/global';
import classes from './ConditionalRenderingComponent.module.css';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import type {
  ConditionalRenderingConnection,
  ConditionalRenderingConnections,
} from 'app-shared/types/RuleConfig';
import type i18next from 'i18next';
import type { FormComponent } from '../../types/FormComponent';
import { CogIcon, PlusIcon, XMarkOctagonFillIcon } from 'libs/studio-icons/src';
import type { FormContainer } from '../../types/FormContainer';
import { StudioButton, StudioModal } from 'libs/studio-components-legacy/src';
import { withTranslation } from 'react-i18next';
import {
  conditionalRenderingDeleteButtonId,
  conditionalRenderingOutputFieldId,
} from '@studio/testing/testids';

export interface IConditionalRenderingComponentProps {
  connectionId?: string;
  saveEdit: (id: string, connection: ConditionalRenderingConnection) => void;
  ruleModelElements: IRuleModelFieldElement[];
  conditionalRendering: ConditionalRenderingConnections;
  formLayoutComponents: IFormDesignerComponents;
  deleteConnection?: (connectionId: string) => void;
  formLayoutContainers: IFormDesignerContainers;
  order: IFormLayoutOrder;
  t: typeof i18next.t;
}

interface IConditionalRenderingComponentState {
  selectedFunctionNr: number | null;
  connectionId: string | null;
  selectableActions: string[];
  conditionalRendering: ConditionalRenderingConnection;
  dialogRef: React.RefObject<HTMLDialogElement>;
}

class ConditionalRendering extends React.Component<
  IConditionalRenderingComponentProps,
  IConditionalRenderingComponentState
> {
  constructor(props: IConditionalRenderingComponentProps) {
    super(props);
    const id = uuidv1();
    this.state = {
      selectedFunctionNr: null,
      connectionId: null,
      selectableActions: ['Show', 'Hide'],
      conditionalRendering: {
        selectedFunction: '',
        inputParams: {},
        selectedAction: '',
        selectedFields: {
          [id]: '',
        },
      },
      dialogRef: React.createRef(),
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
    this.props.saveEdit(this.state.connectionId, this.state.conditionalRendering);
    if (!this.props.connectionId) {
      const id = uuidv1();
      this.setState({
        selectedFunctionNr: null,
        connectionId: uuidv1(),
        selectableActions: ['Show', 'Hide'],
        conditionalRendering: {
          selectedFunction: '',
          inputParams: {},
          selectedAction: '',
          selectedFields: {
            [id]: '',
          },
        },
      });
    }
    this.state.dialogRef?.current?.close();
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
   * Methods that updates the input param connections to the data model
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
   * components that will be affected by the conditional rendering rule.
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
    const component: FormComponent = this.props.formLayoutComponents[id];
    const labelText = getComponentTitleByComponentType(component.type, this.props.t);
    return (
      <option key={id} value={id}>
        {`${labelText} (${id})`}
      </option>
    );
  };

  public renderConditionalRenderingTargetContainerOptions = (
    id: string,
    baseContainer?: boolean,
  ): JSX.Element[] => {
    const options: JSX.Element[] = [];
    if (!this.props.order[id]) {
      return options;
    }
    if (!baseContainer) {
      const container: FormContainer = this.props.formLayoutContainers[id];
      const name = getComponentTitleByComponentType(container.type, this.props.t);
      options.push(
        <option key={id} value={id}>
          {`${name} (${id})`}
        </option>,
      );
    } else {
      this.props.order[id].forEach((key) => {
        if (this.props.formLayoutComponents[key]) {
          const option = this.renderConditionalRenderingTargetComponentOption(key);
          options.push(option);
        } else {
          // A container can have components and sub-containers
          const containerOptions = this.renderConditionalRenderingTargetContainerOptions(key);
          containerOptions.forEach((option) => {
            options.push(option);
          });
        }
      });
    }
    return options;
  };

  public renderConditionalRenderingTargetOptions = (): JSX.Element[] => {
    const options: JSX.Element[] = [];
    Object.keys(this.props.order).forEach((key) => {
      const containerKey = Object.keys(this.props.order)[0];
      const isBaseContainer = containerKey === BASE_CONTAINER_ID;
      const containerOptions = this.renderConditionalRenderingTargetContainerOptions(
        key,
        isBaseContainer,
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
      <StudioModal.Root>
        {!this.props.connectionId ? (
          <StudioModal.Trigger
            aria-label={this.props.t('right_menu.rules_conditional_rendering_add_alt')}
            icon={<PlusIcon />}
            variant='tertiary'
          />
        ) : (
          <StudioModal.Trigger variant='tertiary' icon={<CogIcon />}>
            {selectedMethod}
          </StudioModal.Trigger>
        )}
        <StudioModal.Dialog
          ref={this.state.dialogRef}
          heading={this.props.t('ux_editor.modal_configure_conditional_rendering_header')}
          closeButtonTitle={this.props.t('general.close')}
        >
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
              {this.props.ruleModelElements?.map((funcObj: any) => {
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
                    'ux_editor.modal_configure_conditional_rendering_configure_input_header',
                  )}
                </h2>
                {Object.keys(this.props.ruleModelElements[selectedMethodNr].inputs).map(
                  (key: any) => {
                    const paramName = key;
                    return (
                      <Fragment key={key}>
                        <label className={classes.label} htmlFor={paramName}>
                          {this.props.t(
                            'ux_editor.modal_configure_conditional_rendering_configure_input_param_helper',
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
                              label={this.props.t('ux_editor.modal_properties_data_model_helper')}
                              onDataModelChange={this.handleParamDataChange.bind(null, paramName)}
                              selectedElement={
                                this.state.conditionalRendering.inputParams[paramName]
                              }
                              hideRestrictions={true}
                            />
                          </div>
                        </div>
                      </Fragment>
                    );
                  },
                )}
              </div>
              <div>
                <h2 className={classes.subTitle}>
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_output_header',
                  )}
                </h2>
                <div className={classes.selectActionContainer}>
                  <label className={classes.label} htmlFor='select_action'>
                    {this.props.t(
                      'ux_editor.modal_configure_conditional_rendering_configure_output_action_helper',
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
                    'ux_editor.modal_configure_conditional_rendering_configure_output_field_helper',
                  )}
                </p>
                {Object.keys(this.state.conditionalRendering.selectedFields).map((key: any) => {
                  return (
                    <div className={classes.chooseComponentContainer} key={key}>
                      <select
                        name={key}
                        data-testid={conditionalRenderingOutputFieldId}
                        onChange={this.handleFieldMappingChange.bind(null, key)}
                        value={this.state.conditionalRendering.selectedFields[key]}
                        className={classes.customSelect}
                        style={{ fontSize: '16px' }}
                      >
                        <option value=''>{this.props.t('general.select_component')}</option>
                        {this.renderConditionalRenderingTargetOptions()}
                      </select>

                      <StudioButton
                        type='button'
                        data-testid={conditionalRenderingDeleteButtonId}
                        className={classes.deleteFieldButton}
                        onClick={this.removeFieldMapping.bind(null, key)}
                      >
                        <XMarkOctagonFillIcon className={classes.exitIcon} />
                      </StudioButton>
                    </div>
                  );
                })}
                <StudioButton
                  type='button'
                  className={classes.addFieldButton}
                  onClick={this.addNewField}
                >
                  {this.props.t(
                    'ux_editor.modal_configure_conditional_rendering_configure_add_new_field_mapping',
                  )}
                </StudioButton>
              </div>
            </>
          ) : null}
          <div className={classes.buttonsContainer}>
            {this.state.conditionalRendering.selectedFunction ? (
              <StudioButton
                onClick={this.handleSaveEdit}
                type='submit'
                className={classes.saveButton}
              >
                {this.props.t('general.save')}
              </StudioButton>
            ) : null}
            {this.props.connectionId ? (
              <StudioButton
                type='button'
                className={classes.dangerButton}
                onClick={this.handleDeleteConnection}
              >
                {this.props.t('general.delete')}
              </StudioButton>
            ) : null}
            <StudioButton
              className={classes.cancelButton}
              onClick={() => {
                this.state.dialogRef?.current?.close();
              }}
            >
              {this.props.t('general.cancel')}
            </StudioButton>
          </div>
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  }
}

export const ConditionalRenderingComponent = withTranslation()(ConditionalRendering);
