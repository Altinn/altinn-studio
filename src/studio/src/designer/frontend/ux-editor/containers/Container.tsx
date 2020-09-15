/* eslint-disable no-undef */
/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable global-require */
/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-nested-ternary */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { createStyles, IconButton, withStyles, WithStyles, Grid, Typography } from '@material-ui/core';

import '../styles/index.css';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnPopover from 'app-shared/components/molecules/AltinnPopoverSimple';
import { makeGetActiveFormContainer,
  makeGetLayoutComponentsSelector,
  makeGetLayoutContainerOrder,
  makeGetLayoutContainersSelector } from '../selectors/getLayoutData';
import { renderSelectGroupDataModelBinding, renderSelectTextFromResources } from '../utils/render';
import { FormComponentWrapper } from '../components/FormComponent';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { getTextResource } from '../utils/language';

export interface IProvidedContainerProps extends WithStyles<typeof styles>{
  id: string;
  index?: number;
  baseContainer?: boolean;
  items?: string[];
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
  sendListToParent?: (item: object) => void;
}

export interface IContainerProps extends IProvidedContainerProps {
  dataModelGroup?: string;
  itemOrder: any;
  components: IFormDesignerComponent;
  containers: any;
  repeating: boolean;
  index?: number;
  formContainerActive?: boolean;
  activeList: any[];
  language: any;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
}

export interface IContainerState {
  itemOrder: any;
  currentlyDragging: boolean;
  activeList: any[];
  editMode: boolean;
  tmpContainer: ICreateFormContainer;
  tmpId: string;
  expanded: boolean;
  editGroupIdError: string;
  popopAnchor: React.RefObject<HTMLDivElement>;
}

const styles = createStyles({
  hoverStyle: {
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    },
  },
  borderBottom: {
    borderBottom: `0.15em dotted ${altinnTheme.altinnPalette.primary.blue}`,
  },
  borderTop: {
    borderTop: `0.15em dotted ${altinnTheme.altinnPalette.primary.blue}`,
  },
  icon: {
    color: altinnTheme.altinnPalette.primary.grey,
    fontSize: '2.4rem!important',
  },
  formGroup: {
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
    color: `${altinnTheme.altinnPalette.primary.blueDark}!important`,
    paddingRight: '1.2rem',
    height: '48px',
    cursor: 'pointer',
  },
  containerEdit: {
    visibility: 'hidden',
  },
  iconButton: {
    fontSize: '0.6em !important',
    paddingLeft: '0.4rem',
    '&:hover': {
      background: 'none',
    },
  },
  expandIcon: {
    paddingRight: '0px',
  },
  editIcon: {
    fontSize: '0.85em !important',
    marginLeft: '-12px',
    '&:hover': {
      background: 'none',
    },
  },
  wrapper: {
    '&:hover $containerEdit ': {
      visibility: 'visible',
    },
  },
  editWrapper: {
    '&:hover $containerEdit ': {
      visibility: 'visible',
    },
  },
  editSection: {
    backgroundColor: '#fff',
    boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    padding: '0.45rem 1.05rem 1.05rem 1.05rem',
    marginBottom: '1.2rem',
    border: '0.15rem solid #fff',
  },
  createErrorPopoverRoot: {
    backgroundColor: altinnTheme.altinnPalette.primary.redLight,
  },
  popoverErrorIcon: {
    color: altinnTheme.altinnPalette.primary.red,
    paddingTop: '0.8rem',
  },
  popoverTechnicalErrorText: {
    fontSize: '1.4rem',
    paddingTop: '0.5rem',
  },
});

const validComponentId = /^[0-9a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/;

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
      editMode: false,
      tmpContainer: JSON.parse(JSON.stringify(this.props.containers[this.props.id])) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
      expanded: true,
      editGroupIdError: null,
      popopAnchor: React.createRef<HTMLDivElement>(),
    };
  }

  public handleChangeRepeatingGroup = () => {
    this.setState((prevState: IContainerState) => {
      const tmpContainer = prevState.tmpContainer;
      const isRepeating = (tmpContainer.maxCount > 0);
      if (isRepeating) {
        // we are disabling the repeating feature, remove datamodelbinding
        tmpContainer.dataModelBindings.group = undefined;
        tmpContainer.maxCount = undefined;
        tmpContainer.textResourceBindings = undefined;
      } else {
        tmpContainer.maxCount = 2;
      }
      return {
        tmpContainer,
      };
    });
  }

  public handleMaxOccourChange = (event: any) => {
    let maxOcc = event.target?.value;
    if (maxOcc < 2) {
      maxOcc = 2;
    }
    this.setState((prevState: IContainerState) => {
      return {
        tmpContainer: {
          ...prevState.tmpContainer,
          maxCount: maxOcc,
        },
      };
    });
  }

  public handleContainerDelete = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    FormDesignerActionDispatchers.deleteFormContainer(this.props.id, this.props.index);
  }

  public handleDiscard = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    FormDesignerActionDispatchers.deleteActiveListAction();
    this.setState({
      editMode: false,
      tmpContainer: JSON.parse(JSON.stringify(this.props.containers[this.props.id])) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
    });
  }

  public handleSave = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    if (this.state.tmpId && this.state.tmpId !== this.props.id) {
      if (this.idAlreadyExist(this.state.tmpId)) {
        this.setState(() => ({
          editGroupIdError: getLanguageFromKey('ux_editor.modal_properties_group_id_not_unique_error', this.props.language),
        }));
      } else if (!validComponentId.test(this.state.tmpId)) {
        this.setState(() => ({
          editGroupIdError: getLanguageFromKey('ux_editor.modal_properties_group_id_not_valid', this.props.language),
        }));
      } else {
        FormDesignerActionDispatchers.updateFormContainer(this.state.tmpContainer, this.props.id);
        FormDesignerActionDispatchers.deleteActiveListAction();
        FormDesignerActionDispatchers.updateContainerId(this.props.id, this.state.tmpId);
        this.setState({
          editMode: false,
        });
      }
    } else {
      FormDesignerActionDispatchers.updateFormContainer(this.state.tmpContainer, this.props.id);
      FormDesignerActionDispatchers.deleteActiveListAction();
      this.setState({
        editMode: false,
      });
    }
  }

  public handleNewId = (event: any) => {
    if (this.idAlreadyExist(event.target.value) && event.target.value !== this.props.id) {
      this.setState(() => ({
        editGroupIdError: getLanguageFromKey('ux_editor.modal_properties_group_id_not_unique_error', this.props.language),
      }));
    } else if (!validComponentId.test(event.target.value)) {
      this.setState(() => ({
        editGroupIdError: getLanguageFromKey('ux_editor.modal_properties_group_id_not_valid', this.props.language),
      }));
    } else {
      this.setState({
        editGroupIdError: null,
      });
    }
  }

  public idAlreadyExist = (newId: string): boolean => {
    return Object.keys(this.props.containers).findIndex((key) => key.toUpperCase() === newId.toUpperCase()) > -1 ||
      Object.keys(this.props.components).findIndex((key) => key.toUpperCase() === newId.toUpperCase()) > -1;
  }

  public handleClosePopup = () => {
    this.setState({
      editGroupIdError: null,
    });
  }

  public handleButtonTextChange = (e: any) => {
    this.setState((prevState: IContainerState) => {
      const updatedContainer = prevState.tmpContainer;
      if (!updatedContainer.textResourceBindings) {
        updatedContainer.textResourceBindings = {};
      }
      updatedContainer.textResourceBindings.add_button = e ? e.value : null;
      return {
        tmpContainer: updatedContainer,
      };
    });
  }

  public handleTableHeadersChange = (id: string, index: number) => {
    this.setState((prevState: IContainerState) => {
      const updatedContainer = prevState.tmpContainer;
      if (!prevState.tmpContainer.tableHeaders) {
        updatedContainer.tableHeaders = [...prevState.itemOrder];
      }
      if (updatedContainer.tableHeaders.includes(id)) {
        updatedContainer.tableHeaders.splice(updatedContainer.tableHeaders.indexOf(id), 1);
      } else {
        updatedContainer.tableHeaders.splice(index, 0, id);
      }
      if (updatedContainer.tableHeaders?.length === this.props.itemOrder.length) {
        // table headers is the same as children. We ignore the table header prop
        updatedContainer.tableHeaders = undefined;
      }
      return {
        tmpContainer: updatedContainer,
      };
    });
  }

  public getMaxOccursForGroupFromDataModel = (dataBindingName: string): number => {
    const element: IDataModelFieldElement = this.props.dataModel.find((e: IDataModelFieldElement) => {
      return e.dataBindingName === dataBindingName;
    });
    return element?.maxOccurs;
  }

  public handleDataModelGroupChange = (dataBindingName: string, key: string) => {
    const maxOccurs = this.getMaxOccursForGroupFromDataModel(dataBindingName);
    this.setState((prevState: IContainerState) => {
      return {
        tmpContainer: {
          ...prevState.tmpContainer,
          dataModelBindings: {
            [key]: dataBindingName,
          },
          maxCount: maxOccurs,
        },
      };
    });
  }

  public handleIdChange = (event: any) => {
    this.setState({
      tmpId: event.target.value,
    });
  }

  public handleExpand = () => {
    this.setState((prevState: IContainerState) => {
      return {
        expanded: !prevState.expanded,
      };
    });
  }

  public handleEditMode = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    this.setState((prevState: IContainerState) => {
      const isEdit = !(prevState.editMode);
      if (isEdit) {
        const activeObject = {
          firstInActiveList: false,
          id: this.props.id,
          inEditMode: true,
          lastInActiveList: true,
          order: this.props.index,
        };
        this.props.sendListToParent([activeObject]);
        FormDesignerActionDispatchers.updateActiveList(activeObject, this.props.activeList);
      }
      return {
        editMode: isEdit,
      };
    });
  }

  public renderContent = (ref?: any): JSX.Element => {
    const className: string = this.props.baseContainer ? 'col-12' : `${this.props.classes.formGroup} ${this.props.classes.borderTop}`;
    const hoverClass: string = this.props.baseContainer ? '' : this.props.classes.hoverStyle;
    if (this.state.editMode) {
      return this.renderEditMode();
    }
    return (
      <Grid container={true}>
        <Grid
          container={true}
          onClick={this.changeActiveFormContainer}
          ref={ref}
          className={this.props.classes.wrapper}
        >
          <Grid
            item={true}
            xs={11}
            className={className}
            alignItems='stretch'
          >
            {(!this.props.baseContainer) &&
              <Grid item={true} style={{ paddingTop: '12px' }}>
                <IconButton
                  type='button'
                  className={`${this.props.classes.iconButton} ${this.props.classes.expandIcon}`}
                  onClick={this.handleExpand}
                >
                  <i
                    role='button'
                    className={
                      `${this.props.classes.icon} fa fa-expand-alt${this.state.expanded ? ' fa-rotate-90' : ''}`}
                  />
                </IconButton>
                {`Gruppe - ${this.props.id}`}
              </Grid>
            }
          </Grid>
          {!this.props.baseContainer &&
            <Grid
              container={true}
              direction='row'
              className={this.props.classes.containerEdit}
              xs={1}
            >
              {this.state.editMode ? this.renderEditIcons() : this.renderHoverIcons()}
            </Grid>
          }
        </Grid>
        <Grid
          container={true}
          direction='row'
          spacing={0}
        >
          <Grid
            item={true}
            xs={12}
          >
            {!this.props.itemOrder.length ?
              this.renderContainerPlaceholder() :
              (this.state.expanded && this.props.itemOrder.map((id: string, index: number) => (
                this.props.components[id] ?
                  this.renderFormComponent(id, index) :
                  this.props.containers[id] ?
                    this.renderContainer(id, index)
                    : null
              ))
              )}
          </Grid>
        </Grid>
        {!this.props.baseContainer &&
          <Grid
            container={true}
            direction='row'
            spacing={0}
          >
            <Grid
              item={true}
              xs={11}
              className={`${this.props.classes.borderBottom} ${hoverClass}`}
            />
          </Grid>
        }
      </Grid>
    );
  }

  public renderEditSection = (): JSX.Element => {
    return (
      <Grid
        direction='column'
        container={true}
      >
        <Grid item={true} xs={12}>
          <AltinnInputField
            id='group-id'
            onChangeFunction={this.handleIdChange}
            onBlurFunction={this.handleNewId}
            inputValue={this.state.tmpId}
            inputDescription={getLanguageFromKey(
              'ux_editor.modal_properties_group_change_id', this.props.language,
            )}
            inputFieldStyling={{ width: '100%', marginBottom: '24px' }}
            inputDescriptionStyling={{ marginTop: '24px' }}
          />
          <div ref={this.state.popopAnchor} />
          <AltinnPopover
            anchorEl={this.state.editGroupIdError != null ? this.state.popopAnchor.current : null}
            handleClose={this.handleClosePopup}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            paperProps={{
              classes: {
                root: this.props.classes.createErrorPopoverRoot,
              },
            }}
          >
            <Grid
              container={true}
              direction='row'
              spacing={3}
            >
              <Grid
                item={true}
                xs={1}
                style={{
                  padding: 0,
                }}
              >
                <i className={`${this.props.classes.popoverErrorIcon} ai ai-circle-exclamation`}/>
              </Grid>
              <Grid
                item={true}
                xs={11}
                style={{
                  padding: 0,
                }}
              >
                <Typography
                  className={this.props.classes.popoverTechnicalErrorText}
                >
                  {this.state.editGroupIdError}
                </Typography>
              </Grid>
            </Grid>
          </AltinnPopover>
        </Grid>
        <Grid item={true} xs={12}>
          <AltinnCheckBox
            checked={this.state.tmpContainer.maxCount > 1}
            onChangeFunction={this.handleChangeRepeatingGroup}
          />
          {this.props.language.ux_editor.modal_properties_group_repeating}
        </Grid>
        {(this.state.tmpContainer.maxCount > 1) &&
          <Grid item={true} xs={12}>
            {renderSelectGroupDataModelBinding(
              this.state.tmpContainer.dataModelBindings,
              this.handleDataModelGroupChange,
              this.props.language,
              'group',
            )}
            <AltinnInputField
              id='modal-properties-maximum-files'
              onChangeFunction={this.handleMaxOccourChange}
              inputValue={this.state.tmpContainer.maxCount}
              inputDescription={getLanguageFromKey('ux_editor.modal_properties_group_max_occur', this.props.language)}
              inputFieldStyling={{ width: '60px' }}
              inputDescriptionStyling={{ marginTop: '24px' }}
              type='number'
              isDisabled={!!(this.state.tmpContainer.dataModelBindings.group)}
            />
            {renderSelectTextFromResources('modal_properties_group_add_button',
              this.handleButtonTextChange,
              this.props.textResources,
              this.props.language,
              this.state.tmpContainer.textResourceBindings?.add_button,
              undefined, undefined, undefined,
              getLanguageFromKey('ux_editor.modal_properties_group_add_button_description', this.props.language),
              true)
            }
            {(this.props.itemOrder.length > 0) &&
            <Grid item={true} style={{ marginTop: '24px' }}>
              {this.props.language.ux_editor.modal_properties_group_table_headers}
              {this.props.itemOrder.map((id: string, index: number) => {
                const componentLabel = getTextResource(
                  this.props.components[id].textResourceBindings?.title,
                  this.props.textResources,
                );
                const tableHeaders = this.state.tmpContainer.tableHeaders || this.props.itemOrder;
                return (
                  <Grid item={true} xs={12}>
                    <AltinnCheckBox
                      checked={tableHeaders.includes(id)}
                      onChangeFunction={() => this.handleTableHeadersChange(id, index)}
                    />
                    {componentLabel}
                  </Grid>
                );
              })}
            </Grid>
            }
          </Grid>
        }
      </Grid>
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
        id='placeholder'
        index={0}
        containerId={this.props.id}
      >
        {this.props.language.ux_editor.container_empty}
      </DroppableDraggableComponent>
    );
  }

  public renderEditMode = (): JSX.Element => {
    return (
      <Grid container={true}>
        <Grid
          container={true}
          className={this.props.classes.editWrapper}
        >
          <Grid
            item={true}
            xs={11}
            alignItems='stretch'
            className={this.props.classes.editSection}
          >
            {this.renderEditSection()}
          </Grid>
          <Grid
            item={true}
            xs={1}
            className={this.props.classes.containerEdit}
          >
            {this.renderEditIcons()}
          </Grid>
        </Grid>
      </Grid>
    );
  }

  public renderHoverIcons = (): JSX.Element => {
    return (
      <>
        <Grid item={true} xs={12}>
          <IconButton
            type='button'
            tabIndex={0}
            onClick={this.handleContainerDelete}
            className={this.props.classes.iconButton}
          >
            <i className='fa fa-circletrash' />
          </IconButton>
        </Grid>
        <Grid item={true} xs={12}>
          <IconButton
            type='button'
            onClick={this.handleEditMode}
            className={this.props.classes.editIcon}
          >
            <i className='fa fa-edit' />
          </IconButton>
        </Grid>
      </>
    );
  }

  public renderEditIcons = (): JSX.Element => {
    return (
      <>
        <Grid item={true} xs={12}>
          <IconButton
            type='button'
            className={`${this.props.classes.iconButton}`}
            onClick={this.handleDiscard}
          >
            <i className='fa fa-circlecancel' />
          </IconButton>
        </Grid>
        <Grid item={true} xs={12}>
          <IconButton
            type='button'
            className={`${this.props.classes.iconButton}`}
            onClick={this.handleSave}
          >
            <i className='fa fa-circlecheck' />
          </IconButton>
        </Grid>
      </>
    );
  }

  public renderContainer = (id: string, index: number): JSX.Element => {
    const DroppableDraggableContainer = require('./DroppableDraggableContainer').default;
    const canDrag: boolean = !(this.state.activeList.find((element: any) => element.id === id));
    return (
      <DroppableDraggableContainer
        id={id}
        index={index}
        baseContainer={false}
        parentContainerId={this.props.id}
        canDrag={canDrag}
        onDropComponent={this.props.onDropComponent}
        onMoveComponent={this.props.onMoveComponent}
        onDropContainer={this.props.onDropContainer}
        onMoveContainer={this.props.onMoveContainer}
        key={id}
      >
        <Container
          id={id}
          key={id}
          index={index}
          items={this.props.itemOrder[id]}
          baseContainer={false}
          onDropComponent={this.props.onDropComponent}
          onMoveComponent={this.props.onMoveComponent}
          onDropContainer={this.props.onDropContainer}
          onMoveContainer={this.props.onMoveContainer}
          sendListToParent={this.handleActiveListChange}
        />
      </DroppableDraggableContainer>
    );
  }

  public handleActiveListChange = (list: any[]) => {
    this.setState({
      activeList: list,
    });
  }

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    const activeListIndex = this.props.activeList.findIndex((listItem: any) => listItem.id === id);
    const DroppableDraggableComponent = require('./DroppableDraggableComponent').default;
    let canDrag: boolean = true;
    // eslint-disable-next-line no-restricted-syntax
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
        onDropComponent={this.props.onDropComponent}
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
          sendListToParent={this.handleActiveListChange}
          singleSelected={this.props.activeList.length === 1}
          partOfGroup={!this.props.baseContainer}
        />
      </DroppableDraggableComponent>
    );
  }

  public changeActiveFormContainer = (e: any) => {
    e.stopPropagation();
  }

  public render() {
    return this.renderContent();
  }
}

const makeMapStateToProps = () => {
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetActiveFormContainer = makeGetActiveFormContainer();
  const GetContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutContainerOrder = makeGetLayoutContainerOrder();
  const mapStateToProps = (state: IAppState, props: IProvidedContainerProps): IContainerProps => {
    const containers = GetContainersSelector(state);
    const container = containers[props.id];
    const itemOrder = GetLayoutContainerOrder(state, props.id);
    return {
      ...props,
      activeList: state.formDesigner.layout.activeList,
      dataModelGroup: container.dataModelGroup,
      repeating: container.repeating,
      formContainerActive: GetActiveFormContainer(state, props),
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      language: state.appData.language.language,
      itemOrder: !props.items ? itemOrder : props.items,
      id: props.id,
      index: props.index,
      baseContainer: props.baseContainer,
      dataModel: state.appData.dataModel.model,
      onMoveComponent: props.onMoveComponent,
      onDropComponent: props.onDropComponent,
      onMoveContainer: props.onMoveContainer,
      onDropContainer: props.onDropContainer,
      textResources: state.appData.textResources.resources,
    };
  };
  return mapStateToProps;
};

export const Container = withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(ContainerComponent));
