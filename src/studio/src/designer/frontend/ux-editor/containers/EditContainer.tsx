/* eslint-disable no-nested-ternary */
import { createStyles, Grid, IconButton, ListItem, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import { makeGetLayoutComponentsSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { componentIcons } from '../components';

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
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
    border: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    color: `${altinnTheme.altinnPalette.primary.blueDarker}!important`,
    padding: '0.45rem 1.05rem 1.05rem 1.05rem',
    marginBottom: '1.2rem',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0rem 0rem 0.4rem rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blue,
    paddingLeft: '0',
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
  gridForBtnGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'hidden',
    paddingBottom: '0.8rem',
  },
  gridForBtnActive: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
    marginLeft: '0.2rem',
  },
  gridForBtnActiveGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  gridForBtnSingleActive: {
    marginTop: '-0.2rem !important',
    marginLeft: '-1rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  gridForBtnSingleActiveGroup: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '0.8rem',
  },
  inputHelper: {
    marginTop: '1rem',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  listBorder: {
    padding: '1.1rem 1.2rem 0 1.2rem',
    marginTop: '0.1rem',
    borderLeft: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    borderRight: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    outline: '0 !important',
    '&.first': {
      paddingTop: '1.2rem',
      borderTop: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
    },
    '&.last': {
      paddingBottom: '1.2rem',
      borderBottom: `0.15rem dotted ${altinnTheme.altinnPalette.primary.grey}`,
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
    color: `${altinnTheme.altinnPalette.primary.blueDarker}!important`,
  },
  textSecondaryDark: {
    color: `${altinnTheme.altinnPalette.primary.grey}!important`,
  },
  wrapper: {
    '&:hover': {
      cursor: 'pointer',
    },
    '&:hover $gridForBtn': {
      visibility: 'visible',
    },
    '&:hover $gridForBtnGroup': {
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
  partOfGroup?: boolean;
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

export class Edit extends React.Component<IEditContainerProps, IEditContainerState> {
  constructor(_props: IEditContainerProps, _state: IEditContainerState) {
    super(_props, _state);
    if (!_props.component.textResourceBindings) {
      // eslint-disable-next-line no-param-reassign
      _props.component.textResourceBindings = {};
    }
    this.state = {
      isEditModalOpen: false,
      isEditMode: false,
      hideDelete: false,
      hideEdit: false,
      component: {
        id: this.props.id,
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
    const activeListLength = this.props.activeList.length;
    if (activeListLength > 1) {
      FormDesignerActionDispatchers.deleteFormComponents(this.props.activeList);
    } else {
      FormDesignerActionDispatchers.deleteFormComponents([this.props.id]);
    }
    FormDesignerActionDispatchers.deleteActiveListAction();
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
      const { required: requiredState, ...restState } = this.state.component;
      const { required: requiredProps, ...restProps } = this.props.component;
      if (JSON.stringify(restState) !== JSON.stringify(restProps)) {
        this.handleSaveChange(this.state.component);
      }
      this.props.sendItemToParent(this.state.listItem);
      FormDesignerActionDispatchers.deleteActiveListAction();
    });
  }

  public handleDiscard = (): void => {
    this.setState({
      component: { ...this.props.component },
      isEditMode: false,
    });
    FormDesignerActionDispatchers.deleteActiveListAction();
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    const { id, ...rest } = callbackComponent;
    FormDesignerActionDispatchers.updateFormComponent(
      rest,
      this.props.id,
    );
    if (id !== this.props.id) {
      FormDesignerActionDispatchers.updateContainerId(this.props.id, id);
    }
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
    if (first) {
      return last ? 'first last' : 'first';
    }
    return last ? 'last' : '';
  }

  public btnGrid = () => {
    if (this.props.activeList.length > 1) {
      if (this.props.partOfGroup) {
        return this.props.classes.gridForBtnActiveGroup;
      }
      return this.props.classes.gridForBtnActive;
    }
    if (this.props.activeList.length === 1) {
      if (this.props.partOfGroup) {
        return this.props.classes.gridForBtnSingleActiveGroup;
      }
      return this.props.classes.gridForBtnSingleActive;
    }
    if (this.props.partOfGroup) {
      return this.props.classes.gridForBtnGroup;
    }
    return this.props.classes.gridForBtn;
  }

  public render(): JSX.Element {
    const activeListIndex =
      this.props.activeList.findIndex((listItem: any) => listItem.id === this.props.id);
    return (
      <>
        <Grid container={true}>
          <Grid
            container={true}
            direction='row'
            spacing={0}
            className={this.props.classes.wrapper}
          >
            <Grid
              item={true}
              xs={11}
              className={(this.props.activeList.length > 1) && (activeListIndex >= 0) ?
                this.props.classes.gridWrapperActive : (this.props.partOfGroup ? '' : this.props.classes.gridWrapper)}
            >
              <div
                className={(this.props.activeList.length > 1) && (activeListIndex >= 0) ?
                  `${this.props.classes.listBorder} ${this.setPlacementClass(activeListIndex)}` :
                  this.props.classes.noOutline}
              >
                <ListItem
                  className={activeListIndex > -1 || this.state.isEditMode ? this.props.classes.active :
                    ((this.props.component.type === 'Group') ? this.props.classes.formGroup : this.props.classes.formComponent)}
                  onClick={this.handleSetActive}
                  tabIndex={0}
                  onKeyPress={this.handleKeyPress}
                  component='div'
                >
                  {this.state.isEditMode ?
                    <Grid
                      item={true}
                      xs={12}
                      className={this.props.classes.activeWrapper}
                    >
                      <EditModalContent
                        component={JSON.parse(JSON.stringify(this.state.component))}
                        language={this.props.language}
                        handleComponentUpdate={this.handleComponentUpdate}
                      />
                    </Grid>
                    :
                    <div className={`${this.props.classes.textPrimaryDark} ${this.props.classes.formComponentTitle}`}>
                      <i
                        className={
                          `${this.props.classes.icon} ${componentIcons[this.state.component.type]}`
                        }
                      />
                      {this.state.component.textResourceBindings.title ?
                        truncate(
                          getTextResource(this.state.component.textResourceBindings.title,
                            this.props.textResources), 80,
                        )
                        : getComponentTitleByComponentType(this.state.component.type, this.props.language)}
                    </div>
                  }
                </ListItem>
              </div>
            </Grid>
            {!this.state.isEditMode &&
              <Grid item={true} xs={1}>
                <Grid
                  container={true}
                  direction='row'
                  className={this.btnGrid()}
                >
                  <Grid item={true} xs={12}>
                    {(activeListIndex === 0 || this.props.activeList.length < 1) &&
                      <IconButton
                        type='button'
                        className={`${this.props.classes.formComponentsBtn} ${this.props.classes.specialBtn}`}
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
                  direction='row'
                  // eslint-disable-next-line max-len
                  className={this.props.partOfGroup ? this.props.classes.gridForBtnSingleActiveGroup : this.props.classes.gridForBtnSingleActive}
                >
                  <Grid item={true} xs={12}>
                    <IconButton
                      type='button'
                      className={`${this.props.classes.formComponentsBtn} ${this.props.classes.specialBtn}`}
                      onClick={this.handleDiscard}
                      tabIndex={0}
                    >
                      <i className='fa fa-circlecancel' />
                    </IconButton>
                  </Grid>
                  <Grid item={true} xs={12}>
                    <IconButton
                      type='button'
                      className={`${this.props.classes.formComponentsBt} ${this.props.classes.specialBtn}`}
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
