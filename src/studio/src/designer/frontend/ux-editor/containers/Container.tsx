import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import {
  createStyles,
  Grid,
  IconButton,
  WithStyles,
  withStyles,
} from '@material-ui/core';

import '../styles/index.css';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import {
  makeGetActiveFormContainer,
  makeGetLayoutComponentsSelector,
  makeGetLayoutContainerOrder,
  makeGetLayoutContainersSelector,
} from '../selectors/getLayoutData';
import {
  renderOptionalSelectTextFromResources,
  renderSelectGroupDataModelBinding,
} from '../utils/render';
import { FormComponentWrapper } from '../components/FormComponent';
import { getTextResource } from '../utils/language';
import { idExists, validComponentId } from '../utils/formLayout';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type {
  IAppState,
  ICreateFormContainer,
  IDataModelFieldElement,
  IFormDesignerComponents,
  IFormLayoutOrder,
  ITextResource,
} from '../types/global';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import { EditorDndEvents } from './helpers/dnd-types';

export interface IProvidedContainerProps extends WithStyles<typeof styles> {
  isBaseContainer?: boolean;
  dispatch?: Dispatch;
  id: string;
  index?: number;
  items?: string[];
  layoutOrder?: IFormLayoutOrder;
  dndEvents: EditorDndEvents;
  sendListToParent?: (item: object) => void;
}

export interface IContainerProps extends IProvidedContainerProps {
  dataModelGroup?: string;
  itemOrder: any;
  components: IFormDesignerComponents;
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
  groupIdError: string;
  groupIdPopoverRef: RefObject<HTMLDivElement>;
  tableHeadersError: string;
  tableHeadersPopoverRef: RefObject<HTMLDivElement>;
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
});
export class ContainerComponent extends Component<
  IContainerProps,
  IContainerState
> {
  public static getDerivedStateFromProps(
    nextProps: IContainerProps,
    prevState: IContainerState,
  ) {
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
      tmpContainer: JSON.parse(
        JSON.stringify(this.props.containers[this.props.id]),
      ) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
      expanded: true,
      groupIdError: null,
      groupIdPopoverRef: createRef<HTMLDivElement>(),
      tableHeadersError: null,
      tableHeadersPopoverRef: createRef<HTMLDivElement>(),
    };
  }

  public handleChangeRepeatingGroup = () => {
    this.setState((prevState: IContainerState) => {
      const tmpContainer = prevState.tmpContainer;
      const isRepeating = tmpContainer.maxCount > 0;
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
  };

  public handleMaxOccurChange = (event: any) => {
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
  };

  public handleContainerDelete = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    const { dispatch } = this.props;
    event.stopPropagation();
    dispatch(
      FormLayoutActions.deleteFormContainer({
        id: this.props.id,
        index: this.props.index,
      }),
    );
  };

  public handleDiscard = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    dispatch(FormLayoutActions.deleteActiveList());
    this.setState({
      editMode: false,
      tmpContainer: JSON.parse(
        JSON.stringify(this.props.containers[this.props.id]),
      ) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
    });
  };

  public handleSave = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    if (this.state.tmpId && this.state.tmpId !== this.props.id) {
      if (
        idExists(this.state.tmpId, this.props.components, this.props.containers)
      ) {
        this.setState(() => ({
          groupIdError: getLanguageFromKey(
            'ux_editor.modal_properties_group_id_not_unique_error',
            this.props.language,
          ),
        }));
      } else if (!validComponentId.test(this.state.tmpId)) {
        this.setState(() => ({
          groupIdError: getLanguageFromKey(
            'ux_editor.modal_properties_group_id_not_valid',
            this.props.language,
          ),
        }));
      } else {
        dispatch(
          FormLayoutActions.updateFormContainer({
            updatedContainer: this.state.tmpContainer,
            id: this.props.id,
          }),
        );
        dispatch(FormLayoutActions.deleteActiveList());
        dispatch(
          FormLayoutActions.updateContainerId({
            currentId: this.props.id,
            newId: this.state.tmpId,
          }),
        );
        this.setState({
          editMode: false,
        });
      }
    } else if (this.state.tmpContainer.tableHeaders?.length === 0) {
      this.setState({
        tableHeadersError: getLanguageFromKey(
          'ux_editor.modal_properties_group_table_headers_error',
          this.props.language,
        ),
      });
    } else {
      // No validations, save.
      dispatch(
        FormLayoutActions.updateFormContainer({
          updatedContainer: this.state.tmpContainer,
          id: this.props.id,
        }),
      );
      dispatch(FormLayoutActions.deleteActiveList());
      this.setState({
        editMode: false,
      });
    }
  };

  public handleNewId = (event: any) => {
    if (
      idExists(
        event.target.value,
        this.props.components,
        this.props.containers,
      ) &&
      event.target.value !== this.props.id
    ) {
      this.setState(() => ({
        groupIdError: getLanguageFromKey(
          'ux_editor.modal_properties_group_id_not_unique_error',
          this.props.language,
        ),
      }));
    } else if (!validComponentId.test(event.target.value)) {
      this.setState(() => ({
        groupIdError: getLanguageFromKey(
          'ux_editor.modal_properties_group_id_not_valid',
          this.props.language,
        ),
      }));
    } else {
      this.setState({
        groupIdError: null,
      });
    }
  };

  public handleClosePopup = () => {
    this.setState({
      groupIdError: null,
      tableHeadersError: null,
    });
  };

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
  };

  public handleTableHeadersChange = (id: string, index: number) => {
    this.setState((prevState: IContainerState) => {
      const updatedContainer = prevState.tmpContainer;
      if (!prevState.tmpContainer.tableHeaders) {
        updatedContainer.tableHeaders = [...prevState.itemOrder];
      }
      if (updatedContainer.tableHeaders.includes(id)) {
        updatedContainer.tableHeaders.splice(
          updatedContainer.tableHeaders.indexOf(id),
          1,
        );
      } else {
        updatedContainer.tableHeaders.splice(index, 0, id);
      }
      if (
        updatedContainer.tableHeaders?.length === this.props.itemOrder.length
      ) {
        // table headers is the same as children. We ignore the table header prop
        updatedContainer.tableHeaders = undefined;
      }
      let errorMessage;
      if (updatedContainer.tableHeaders?.length === 0) {
        errorMessage = getLanguageFromKey(
          'ux_editor.modal_properties_group_table_headers_error',
          this.props.language,
        );
      }
      return {
        tmpContainer: updatedContainer,
        tableHeadersError: errorMessage,
      };
    });
  };

  public getMaxOccursForGroupFromDataModel = (
    dataBindingName: string,
  ): number => {
    const element: IDataModelFieldElement = this.props.dataModel.find(
      (e: IDataModelFieldElement) => {
        return e.dataBindingName === dataBindingName;
      },
    );
    return element?.maxOccurs;
  };

  public handleDataModelGroupChange = (
    dataBindingName: string,
    key: string,
  ) => {
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
  };

  public handleIdChange = (event: any) => {
    this.setState({
      tmpId: event.target.value,
    });
  };

  public handleExpand = () => {
    this.setState((prevState: IContainerState) => {
      return {
        expanded: !prevState.expanded,
      };
    });
  };

  public handleEditMode = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    this.setState((prevState: IContainerState) => {
      const isEdit = !prevState.editMode;
      if (isEdit) {
        const activeObject = {
          firstInActiveList: false,
          id: this.props.id,
          inEditMode: true,
          lastInActiveList: true,
          order: this.props.index,
        };
        this.props.sendListToParent([activeObject]);
        dispatch(
          FormLayoutActions.updateActiveList({
            containerList: this.props.activeList,
            listItem: activeObject,
          }),
        );
      }
      return {
        editMode: isEdit,
      };
    });
  };

  public render = (ref?: any): JSX.Element => {
    const className: string = this.props.isBaseContainer
      ? 'col-12'
      : `${this.props.classes.formGroup} ${this.props.classes.borderTop}`;
    const hoverClass: string = this.props.isBaseContainer
      ? ''
      : this.props.classes.hoverStyle;
    if (this.state.editMode) {
      return this.renderEditMode();
    }

    return (
      <Grid
        container={true}
        style={
          this.props.isBaseContainer
            ? { paddingTop: '24px', paddingBottom: '24px' }
            : undefined
        }
      >
        <Grid
          container={true}
          onClick={this.changeActiveFormContainer}
          ref={ref}
          className={this.props.classes.wrapper}
        >
          <Grid item={true} xs={11} className={className}>
            {!this.props.isBaseContainer && (
              <Grid item={true} style={{ paddingTop: '12px' }}>
                <IconButton
                  type='button'
                  className={`${this.props.classes.iconButton} ${this.props.classes.expandIcon}`}
                  onClick={this.handleExpand}
                >
                  <i
                    className={`${this.props.classes.icon} fa fa-expand-alt${
                      this.state.expanded ? ' fa-rotate-90' : ''
                    }`}
                  />
                </IconButton>
                {`Gruppe - ${this.props.id}`}
              </Grid>
            )}
          </Grid>
          {!this.props.isBaseContainer && (
            <Grid
              item={true}
              className={this.props.classes.containerEdit}
              xs={1}
            >
              {this.state.editMode
                ? this.renderEditIcons()
                : this.renderHoverIcons()}
            </Grid>
          )}
        </Grid>
        <Grid container={true} direction='row' spacing={0}>
          <Grid item={true} xs={12}>
            {!this.props.itemOrder?.length && this.renderContainerPlaceholder()}
            {this.state.expanded &&
              this.props.itemOrder?.length > 0 &&
              this.props.itemOrder.map((id: string, index: number) => {
                const component = this.props.components[id];
                if (component) {
                  return this.renderFormComponent(id, index);
                }
                return (
                  this.props.containers[id] && this.renderContainer(id, index)
                );
              })}
          </Grid>
        </Grid>
        {!this.props.isBaseContainer && (
          <Grid container={true} direction='row' spacing={0}>
            <Grid
              item={true}
              xs={11}
              className={`${this.props.classes.borderBottom} ${hoverClass}`}
            />
          </Grid>
        )}
      </Grid>
    );
  };

  public renderEditSection = (): JSX.Element => {
    return (
      <Grid direction='column' container={true}>
        <Grid item={true} xs={12}>
          <AltinnInputField
            id='group-id'
            onChangeFunction={this.handleIdChange}
            onBlurFunction={this.handleNewId}
            inputValue={this.state.tmpId}
            inputDescription={getLanguageFromKey(
              'ux_editor.modal_properties_group_change_id',
              this.props.language,
            )}
            inputFieldStyling={{ width: '100%', marginBottom: '24px' }}
            inputDescriptionStyling={{ marginTop: '24px' }}
          />
          <div ref={this.state.groupIdPopoverRef} />
          <ErrorPopover
            anchorEl={
              this.state.groupIdError
                ? this.state.groupIdPopoverRef.current
                : null
            }
            onClose={this.handleClosePopup}
            errorMessage={this.state.groupIdError}
          />
        </Grid>
        <Grid item={true} xs={12}>
          <AltinnCheckBox
            checked={this.state.tmpContainer.maxCount > 1}
            onChangeFunction={this.handleChangeRepeatingGroup}
          />
          {this.props.language.ux_editor.modal_properties_group_repeating}
        </Grid>
        {this.state.tmpContainer.maxCount > 1 && (
          <Grid item={true} xs={12}>
            {renderSelectGroupDataModelBinding(
              this.state.tmpContainer.dataModelBindings,
              this.handleDataModelGroupChange,
              this.props.language,
              'group',
            )}
            <AltinnInputField
              id='modal-properties-maximum-files'
              onChangeFunction={this.handleMaxOccurChange}
              inputValue={this.state.tmpContainer.maxCount}
              inputDescription={getLanguageFromKey(
                'ux_editor.modal_properties_group_max_occur',
                this.props.language,
              )}
              inputFieldStyling={{ width: '60px' }}
              inputDescriptionStyling={{ marginTop: '24px' }}
              type='number'
              isDisabled={!!this.state.tmpContainer.dataModelBindings.group}
            />
            {renderOptionalSelectTextFromResources(
              'modal_properties_group_add_button',
              this.handleButtonTextChange,
              this.props.textResources,
              this.props.language,
              this.state.tmpContainer.textResourceBindings?.add_button,
              this.state.tmpContainer.textResourceBindings?.add_button,
              getLanguageFromKey(
                'ux_editor.modal_properties_group_add_button_description',
                this.props.language,
              ),
            )}
            {this.props.itemOrder.length > 0 && (
              <Grid item={true} style={{ marginTop: '24px' }}>
                {
                  this.props.language.ux_editor
                    .modal_properties_group_table_headers
                }
                {this.props.itemOrder.map((id: string, index: number) => {
                  const componentLabel = getTextResource(
                    this.props.components[id].textResourceBindings?.title,
                    this.props.textResources,
                  );
                  const tableHeaders =
                    this.state.tmpContainer.tableHeaders ||
                    this.props.itemOrder;
                  return (
                    <Grid item={true} xs={12} key={id}>
                      <AltinnCheckBox
                        checked={tableHeaders.includes(id)}
                        onChangeFunction={() =>
                          this.handleTableHeadersChange(id, index)
                        }
                      />
                      {componentLabel}
                    </Grid>
                  );
                })}
                <div ref={this.state.tableHeadersPopoverRef} />
                <ErrorPopover
                  anchorEl={
                    this.state.tableHeadersError
                      ? this.state.tableHeadersPopoverRef.current
                      : null
                  }
                  onClose={this.handleClosePopup}
                  errorMessage={this.state.tableHeadersError}
                />
              </Grid>
            )}
          </Grid>
        )}
      </Grid>
    );
  };

  public renderContainerPlaceholder = () => {
    return (
      <DroppableDraggableComponent
        dndEvents={this.props.dndEvents}
        canDrag={false}
        id='placeholder'
        index={0}
        containerId={this.props.id}
      >
        {this.props.language.ux_editor.container_empty}
      </DroppableDraggableComponent>
    );
  };

  public renderEditMode = (): JSX.Element => {
    return (
      <Grid container={true}>
        <Grid container={true} className={this.props.classes.editWrapper}>
          <Grid item={true} xs={11} className={this.props.classes.editSection}>
            {this.renderEditSection()}
          </Grid>
          <Grid item={true} xs={1} className={this.props.classes.containerEdit}>
            {this.renderEditIcons()}
          </Grid>
        </Grid>
      </Grid>
    );
  };

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
  };

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
  };

  public renderContainer = (id: string, index: number): JSX.Element => {
    const canDrag = !this.state.activeList.find(
      (element: any) => element.id === id,
    );
    return (
      <DroppableDraggableContainer
        id={id}
        index={index}
        isBaseContainer={false}
        parentContainerId={this.props.id}
        canDrag={canDrag}
        dndEvents={this.props.dndEvents}
        key={id}
      >
        <Container
          id={id}
          key={id}
          index={index}
          items={this.props.layoutOrder[id]}
          isBaseContainer={false}
          layoutOrder={this.props.layoutOrder}
          dndEvents={this.props.dndEvents}
          sendListToParent={this.handleActiveListChange}
        />
      </DroppableDraggableContainer>
    );
  };

  public handleActiveListChange = (list: any[]) => {
    this.setState({
      activeList: list,
    });
  };

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    const activeListIndex = this.props.activeList.findIndex(
      (listItem: any) => listItem.id === id,
    );
    let canDrag = true;
    // eslint-disable-next-line no-restricted-syntax
    for (const activeItem of this.state.activeList) {
      if (activeItem.id === id) {
        canDrag = false;
      }
    }
    const firstInActiveList =
      activeListIndex >= 0
        ? this.props.activeList[activeListIndex].firstInActiveList
        : true;
    const lastInActiveList =
      activeListIndex >= 0
        ? this.props.activeList[activeListIndex].lastInActiveList
        : true;
    return (
      <DroppableDraggableComponent
        canDrag={canDrag}
        containerId={this.props.id}
        dndEvents={this.props.dndEvents}
        id={id}
        index={index}
        key={id}
      >
        <FormComponentWrapper
          activeList={this.props.activeList}
          firstInActiveList={firstInActiveList}
          id={id}
          lastInActiveList={lastInActiveList}
          partOfGroup={!this.props.isBaseContainer}
          sendListToParent={this.handleActiveListChange}
          singleSelected={this.props.activeList.length === 1}
        />
      </DroppableDraggableComponent>
    );
  };

  public changeActiveFormContainer = (e: any) => {
    e.stopPropagation();
  };
}

const makeMapStateToProps = () => {
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetActiveFormContainer = makeGetActiveFormContainer();
  const GetContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutContainerOrder = makeGetLayoutContainerOrder();
  return (
    state: IAppState,
    props: IProvidedContainerProps,
  ): IContainerProps => {
    const containers = GetContainersSelector(state);
    const container = containers[props.id];
    const itemOrder = GetLayoutContainerOrder(state, props.id);
    return {
      ...props,
      activeList: state.formDesigner.layout.activeList,
      isBaseContainer: props.isBaseContainer,
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      dataModel: state.appData.dataModel.model,
      dataModelGroup: container?.dataModelGroup,
      dispatch: props.dispatch,
      dndEvents: props.dndEvents,
      formContainerActive: GetActiveFormContainer(state, props),
      id: props.id,
      index: props.index,
      itemOrder: !props.items ? itemOrder : props.items,
      language: state.appData.languageState.language,
      repeating: container?.repeating,
      textResources: state.appData.textResources.resources,
    };
  };
};

export const Container = withStyles(styles, { withTheme: true })(
  connect(makeMapStateToProps)(ContainerComponent),
);
