import {
  createStyles, Grid, IconButton, ListItem, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import uuid = require('uuid');
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import ApiActionDispatchers from '../actions/apiActions/apiActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import { makeGetLayoutComponentsSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import '../styles/index.css';
import { getCodeListConnectionForDatamodelBinding } from '../utils/apiConnection';
import { getTextResource, truncate } from '../utils/language';
import { componentIcons } from './../components';

const styles = createStyles({
  active: {
    backgroundColor: '#fff',
    boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    padding: '0.45rem 1.05rem 1.05rem 1.05rem',
    marginBottom: '1.2rem',
    border: '0.15rem solid #fff',
  },
  activeWrapper: {
    padding: '1.0rem 1.2rem 2rem 1.2rem',
  },
  caption: {
    position: 'absolute',
    right: '1.2rem',
    top: '0.6rem',
    fontSize: '1.2rem',
  },
  formComponent: {
    'backgroundColor': altinnTheme.altinnPalette.primary.greyLight,
    'border': '0.15rem dotted ' + altinnTheme.altinnPalette.primary.grey,
    'color': altinnTheme.altinnPalette.primary.blueDarker + '!mportant',
    'padding': '0.45rem 1.05rem 1.05rem 1.05rem',
    'marginBottom': '1.2rem',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    'fontSize': '0.85em',
    'fill': altinnTheme.altinnPalette.primary.blue,
    'paddingLeft': '0',
    '&:hover': {
      background: 'none',
    },
  },
  formComponentTitle: {
    marginTop: '0.6rem',
  },
  gridWrapper: {
    marginBottom: '0rem',
    padding: '0 1.1rem 0 1.1rem',
  },
  gridWrapperActive: {
    marginBottom: '0rem',
    padding: '0',
  },
  gridForBtn: {
    marginTop: '-0.2rem !important',
    marginLeft: '-1rem !important',
    visibility: 'hidden',
    paddingBottom: '0.8rem',
  },
  gridForBtnActive: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
    marginLeft: '0.2rem',
  },
  gridForBtnSingleActive: {
    marginTop: '-0.2rem !important',
    marginLeft: '-1rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  inputHelper: {
    marginTop: '1rem',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  listBorder: {
    'padding': '1.1rem 1.2rem 0 1.2rem',
    'marginTop': '0.1rem',
    'borderLeft': '0.15rem dotted ' + altinnTheme.altinnPalette.primary.grey,
    'borderRight': '0.15rem dotted ' + altinnTheme.altinnPalette.primary.grey,
    'outline': '0 !important',
    '&.first': {
      paddingTop: '1.2rem',
      borderTop: '0.15rem dotted ' + altinnTheme.altinnPalette.primary.grey,
    },
    '&.last': {
      paddingBottom: '1.2rem',
      borderBottom: '0.15rem dotted ' + altinnTheme.altinnPalette.primary.grey,
      marginBottom: '1.2rem',
    },
    '& $active': {
      marginBottom: '0rem !important',
    },
  },
  noOutline: {
    outline: '0 !important',
  },
  specialBtn: {
    fontSize: '0.6em !important',
    paddingLeft: '0.4rem',
  },
  textPrimaryDark: {
    color: altinnTheme.altinnPalette.primary.blueDarker + '!important',
  },
  textSecondaryDark: {
    color: altinnTheme.altinnPalette.primary.grey + '!important',
  },
  wrapper: {
    '&:hover': {
      cursor: 'pointer',
    },
    '&:hover $gridForBtn': {
      visibility: 'visible',
    },
  },
  icon: {
    color: '#6a6a6a',
    margin: '0 1.2rem 0 1.2rem',
  },
});

export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendItemToParent: any;
  classes: any;
  singleSelected: boolean;
}

export interface IEditContainerProps extends IEditContainerProvidedProps {
  id: string;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
  language: any;
  components: any;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  activeList: any;
  connections: any;
  orderList: any[];
}

export interface IEditContainerState {
  component: IFormComponent;
  isEditModalOpen: boolean;
  isEditMode: boolean;
  hideDelete: boolean;
  hideEdit: boolean;
  listItem: any;
  activeList: any;
}

class Edit extends React.Component<IEditContainerProps, IEditContainerState> {
  constructor(_props: IEditContainerProps, _state: IEditContainerState) {
    super(_props, _state);
    if (!_props.component.textResourceBindings) {
      _props.component.textResourceBindings = {};
    }
    this.state = {
      isEditModalOpen: false,
      isEditMode: false,
      hideDelete: false,
      hideEdit: false,
      component: {
        ...this.props.component,
      },
      listItem: {
        id: _props.id,
        firstInActiveList: _props.firstInActiveList,
        lastInActiveList: _props.lastInActiveList,
        inEditMode: false,
        order: null,
      },
      activeList: _props.activeList,
    };
  }

  public handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    this.setState((state) => {
      return {
        ...state,
        component: { ...updatedComponent },
      };
    });
  }

  public handleComponentDelete = (e: any): void => {
    if (this.props.activeList.length > 1) {
      this.props.activeList.forEach((component: any) => {
        FormDesignerActionDispatchers.deleteFormComponent(component.id);
      });
      FormDesignerActionDispatchers.deleteActiveListAction();
    } else {
      FormDesignerActionDispatchers.deleteFormComponent(this.props.id);
    }
    if (this.props.components[this.props.id].codeListId) {
      const connectionId =
        getCodeListConnectionForDatamodelBinding(
          this.props.components[this.props.id].dataModelBinding,
          this.props.connections);
      if (connectionId) {
        ApiActionDispatchers.delApiConnection(connectionId);
      }
    }
    e.stopPropagation();
  }

  public handleOpenEdit = (): void => {
    this.setState({
      isEditMode: true,
      listItem: {
        ...this.state.listItem,
        inEditMode: true,
      },
    }, () => {
      this.props.sendItemToParent(this.state.listItem);
    });
  }

  public handleSetActive = (): void => {
    if (!this.state.isEditMode) {
      const key: any = Object.keys(this.props.orderList)[0];
      const orderIndex = this.props.orderList[key].indexOf(this.state.listItem.id);

      this.setState((prevState) => ({
        listItem: {
          ...prevState.listItem,
          order: orderIndex,
        },
        hideDelete: false,
      }), () => {
        this.props.sendItemToParent(this.state.listItem);
      });

      if (!this.state.listItem.firstInActiveList) {
        this.setState({
          hideDelete: true,
        });
      }
    }
  }

  public handleSave = (): void => {
    this.setState({
      isEditMode: false,
      listItem: {
        ...this.state.listItem,
        inEditMode: false,
      },
    }, () => {
      this.handleSaveChange(this.state.component);
      this.props.sendItemToParent(this.state.listItem);
    });
  }
  public handleDiscard = (): void => {
    this.setState({
      component: { ...this.props.component },
      isEditMode: false,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.checkForCodeListConnectionChanges(callbackComponent);
    FormDesignerActionDispatchers.updateFormComponent(
      callbackComponent,
      this.props.id,
    );
  }

  public checkForCodeListConnectionChanges = (callbackComponent: FormComponentType): void => {
    const originalComponent: FormComponentType = this.props.components[this.props.id];
    const codeListId = originalComponent.codeListId;
    const dataModelBinding = originalComponent.dataModelBindings.simpleBinding;
    const newCodeListId = callbackComponent.codeListId;
    const newDataModelBinding = callbackComponent.dataModelBindings.simpleBinding;

    if (!newCodeListId || !newDataModelBinding) {
      if (codeListId && dataModelBinding) {
        // there existed a connection before that should now be removed
        const oldConnectionId = getCodeListConnectionForDatamodelBinding(
          dataModelBinding,
          this.props.connections);
        if (oldConnectionId) {
          ApiActionDispatchers.delApiConnection(oldConnectionId);
        }
      }
      return;
    }

    // Update the relevant connection if something has changed, or create new if it does not exist
    if (codeListId !== newCodeListId || dataModelBinding !== newDataModelBinding) {
      const oldConnectionId = getCodeListConnectionForDatamodelBinding(dataModelBinding, this.props.connections);
      if (newDataModelBinding && newCodeListId) {
        this.handleSaveApiConnection(callbackComponent, oldConnectionId);
      }
    }
  }

  public handleDeleteApiConnection = (connectionId: string) => {
    if (!connectionId) {
      return;
    }
    ApiActionDispatchers.delApiConnection(connectionId);
  }

  public handleSaveApiConnection = (callbackComponent: FormComponentType, connectionId: string) => {
    if (!callbackComponent.dataModelBindings) {
      return;
    }
    if (!connectionId) {
      connectionId = uuid();
    }
    const newConnection: any = {
      [connectionId]: {
        codeListId: callbackComponent.codeListId,
        apiResponseMapping: {
          [callbackComponent.dataModelBindings.simpleBinding]: {
            mappingKey: 'codes',
            // for now we only support a key-value pair, this could be changed in the future
            valueKey: 'key',
            labelKey: 'value1',
          },
        },
        clientParams: undefined,
        metaParams: undefined,
        externalApiId: undefined,

      },
    };
    ApiActionDispatchers.addApiConnection(newConnection);
  }

  public handleTitleChange = (e: any): void => {
    this.state.component.textResourceBindings.title = e.value;
  }

  public searchForText = (e: any): void => {
    this.state.component.textResourceBindings.title = e.target.value;
  }

  public handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      this.handleSetActive();
    }
  }

  public setPlacementClass = (index: number) => {
    const first = this.props.activeList[index].firstInActiveList;
    const last = this.props.activeList[index].lastInActiveList;
    if (first && last) {
      return 'first last';
    } else if (first && !last) {
      return 'first';
    } else if (!first && last) {
      return 'last';
    } else {
      return '';
    }
  }
  public btnGrid = () => {
    if (this.props.activeList.length > 1) {
      return this.props.classes.gridForBtnActive;
    } else if (this.props.activeList.length === 1) {
      return this.props.classes.gridForBtnSingleActive;
    } else {
      return this.props.classes.gridForBtn;
    }
  }

  public render(): JSX.Element {
    const activeListIndex =
      this.props.activeList.findIndex((listItem: any) => listItem.id === this.props.id);
    return (
      <>
        <Grid container={true}>
          <Grid
            container={true}
            direction={'row'}
            spacing={0}
            className={this.props.classes.wrapper}
          >
            <Grid
              item={true}
              xs={11}
              className={(this.props.activeList.length > 1) && (activeListIndex >= 0) ?
                this.props.classes.gridWrapperActive : this.props.classes.gridWrapper}
            >
              <div
                className={(this.props.activeList.length > 1) && (activeListIndex >= 0) ?
                  this.props.classes.listBorder + ' ' + this.setPlacementClass(activeListIndex) :
                  this.props.classes.noOutline}
              >
                <ListItem
                  className={activeListIndex > -1 || this.state.isEditMode ? this.props.classes.active :
                    this.props.classes.formComponent}
                  onClick={this.handleSetActive}
                  tabIndex={0}
                  onKeyPress={this.handleKeyPress}
                >
                  {this.state.isEditMode ?
                    <Grid item={true} xs={12} className={this.props.classes.activeWrapper}>
                      <EditModalContent
                        component={this.state.component}
                        language={this.props.language}
                        handleComponentUpdate={this.handleComponentUpdate}
                      />
                    </Grid>
                    :
                    <div className={this.props.classes.textPrimaryDark + ' ' + this.props.classes.formComponentTitle}>
                      <i
                        className={
                          this.props.classes.icon +
                          ' ' +
                          componentIcons[this.state.component.component]
                        }
                      />
                      {this.state.component.textResourceBindings.title ?
                        truncate(
                          getTextResource(this.state.component.textResourceBindings.title,
                            this.props.textResources), 80)
                        : this.props.component.component}
                    </div>
                  }
                </ListItem>
              </div>
            </Grid>
            {!this.state.isEditMode &&
              <Grid item={true} xs={1}>
                <Grid
                  container={true}
                  direction={'row'}
                  className={this.btnGrid()}
                >
                  <Grid item={true} xs={12}>
                    {(activeListIndex === 0 || this.props.activeList.length < 1) &&
                      <IconButton
                        type='button'
                        className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                        onClick={this.handleComponentDelete}
                        tabIndex={0}
                      >
                        <i className='fa fa-circletrash' />
                      </IconButton>
                    }
                  </Grid>
                  <Grid item={true} xs={12}>
                    {(this.props.activeList.length < 1 ||
                      this.props.activeList.length === 1 && activeListIndex === 0) &&
                      <IconButton
                        type='button'
                        className={this.props.classes.formComponentsBtn}
                        onClick={this.handleOpenEdit}
                        tabIndex={0}
                      >
                        <i className='fa fa-edit' />
                      </IconButton>
                    }
                  </Grid>
                </Grid>
              </Grid>}
            {this.state.isEditMode &&
              <Grid item={true} xs={1}>
                <Grid
                  container={true}
                  direction={'row'}
                  className={this.props.classes.gridForBtnSingleActive}
                >
                  <Grid item={true} xs={12}>
                    <IconButton
                      type='button'
                      className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                      onClick={this.handleDiscard}
                      tabIndex={0}
                    >
                      <i className='fa fa-circlecancel' />
                    </IconButton>
                  </Grid>
                  <Grid item={true} xs={12}>
                    <IconButton
                      type='button'
                      className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                      onClick={this.handleSave}
                      tabIndex={0}
                    >
                      <i className='fa fa-circlecheck' />
                    </IconButton>
                  </Grid>
                </Grid>
              </Grid>}
          </Grid>
        </Grid>
      </>
    );
  }
}

const makeMapStateToProps = () => {
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const mapStateToProps = (
    state: IAppState,
    props: IEditContainerProvidedProps,
  ): IEditContainerProps => {
    return {
      activeList: state.formDesigner.layout.activeList,
      classes: props.classes,
      component: props.component,
      components: GetLayoutComponentsSelector(state),
      connections: state.serviceConfigurations.APIs.connections,
      dataModel: state.appData.dataModel.model,
      firstInActiveList: props.firstInActiveList,
      sendItemToParent: props.sendItemToParent,
      id: props.id,
      language: state.appData.language.language,
      lastInActiveList: props.lastInActiveList,
      orderList: GetLayoutOrderSelector(state),
      singleSelected: props.singleSelected,
      textResources: state.appData.textResources.resources,
    };
  };
  return mapStateToProps;
};

export const EditContainer = withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(Edit));
