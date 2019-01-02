import {
  createStyles, Grid, IconButton, ListItem, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import { makeGetLayoutComponentsSelector } from '../selectors/getLayoutData';
import '../styles/index.css';
import { getTextResource, truncate } from '../utils/language';

const styles = createStyles({
  active: {
    backgroundColor: '#fff',
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
    padding: '10px 12px 14px 12px',
  },
  activeWrapper: {
    padding: '10px 12px 20px 12px',
  },
  caption: {
    position: 'absolute',
    right: '12px',
    top: '6px',
    fontSize: '1.2rem',
  },
  formComponent: {
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
    border: '1.5px dotted ' + altinnTheme.altinnPalette.primary.grey,
    color: altinnTheme.altinnPalette.primary.blueDarker + '!mportant',
    padding: '10px 12px 14px 12px',
    marginBottom: '1.2rem',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blue,
    paddingLeft: '0',
    outline: 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  gridWrapper: {
    marginBottom: '0rem',
  },
  gridForBtn: {
    marginTop: '-0.2rem !important',
    visibility: 'hidden',
    paddingBottom: '8px',
    marginLeft: '2px',
  },
  gridForBtnActive: {
    marginTop: '-0.2rem !important',
    visibility: 'visible',
    paddingBottom: '8px',
    marginLeft: '2px',
  },
  inputHelper: {
    marginTop: '1em',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  listBorder: {
    padding: '1.1rem 1.2rem 0 1.2rem',
    marginTop: '0.1rem',
    borderLeft: '1.5px dotted ' + altinnTheme.altinnPalette.primary.grey,
    borderRight: '1.5px dotted ' + altinnTheme.altinnPalette.primary.grey,
    '&#first': {
      paddingTop: '1.2rem',
      borderTop: '1.5px dotted ' + altinnTheme.altinnPalette.primary.grey,
    },
    '&#last': {
      paddingBottom: '1.2rem',
      borderBottom: '1.5px dotted ' + altinnTheme.altinnPalette.primary.grey,
      marginBottom: '1.2rem',
    },
  },
  specialBtn: {
    fontSize: '0.6em !important',
    paddingLeft: '4px',
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
});

export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
  order: number;
  firstInActiveList: boolean;
  handler: any;
  classes: any;
}

export interface IEditContainerProps extends IEditContainerProvidedProps {
  id: string;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
  language: any;
  components: any;
  order: any;
  firstInActiveList: boolean;
  activeList: Array<any>;
}

export interface IEditContainerState {
  component: IFormComponent;
  isEditModalOpen: boolean;
  isItemActive: boolean;
  isEditMode: boolean;
  hideDelete: boolean;
  hideEdit: boolean;
  listItem: any;
  activeList: Array<any>;
}

class Edit extends React.Component<IEditContainerProps, IEditContainerState> {
  constructor(_props: IEditContainerProps, _state: IEditContainerState) {
    super(_props, _state);
    this.state = {
      isEditModalOpen: false,
      isItemActive: false,
      isEditMode: false,
      hideDelete: false,
      hideEdit: false,
      component: _props.component,
      listItem: {
        id: _props.id,
        order: _props.order,
        firstInActiveList: _props.firstInActiveList,
      },
      activeList: _props.activeList,
    };
  }

  public handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    this.setState((state) => {
      return {
        ...state,
        component: updatedComponent,
      };
    });
  }

  public handleComponentDelete = (e: any): void => {
    this.state.activeList.forEach((component) => {
      FormDesignerActionDispatchers.deleteFormComponent(component.id);
    });
    FormDesignerActionDispatchers.deleteActiveListAction();
    e.stopPropagation();
  }

  public handleOpenEdit = (): void => {
    this.setState({
      isItemActive: true,
      isEditMode: true,
    });
  }

  public handleSetActive = (): void => {
    if (!this.state.isEditMode) {
      this.props.handler(this.state.listItem, this.state.activeList);
      this.setState({
        isItemActive: !this.state.isItemActive,
        listItem: this.state.listItem,
        hideDelete: false,
      });
      if (!this.state.listItem.firstInActiveList && !this.state.isItemActive) {
        this.setState({
          hideDelete: true,
        });
      }
    }
  }

  public handleSave = (): void => {
    this.props.handler(this.state.listItem, this.state.activeList);
    this.setState({
      isItemActive: false,
      isEditMode: false,
    });
    this.handleSaveChange(this.state.component);
  }
  public handleDiscard = (): void => {
    this.setState({
      isItemActive: false,
      isEditMode: false,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.state.component.size = this.props.component.size;
    this.handleComponentUpdate(callbackComponent);
  }

  public handleTitleChange = (e: any): void => {
    this.state.component.title = e.value;
  }

  public searchForText = (e: any): void => {
    this.state.component.title = e.target.value;
  }
  public setIdsInGroup = (activeListIndex: number) => {
    if (activeListIndex === 0) {
      return 'first';
    } else if (activeListIndex === this.props.activeList.length - 1) {
      return 'last';
    }
    return null;
  }

  public render(): JSX.Element {
    const activeListIndex = this.props.activeList.findIndex((listItem) => listItem.id === this.props.id);
    console.log(activeListIndex);
    return (
      <>
        <Grid container={true}>
          <Grid
            container={true}
            direction={'row'}
            spacing={0}
            className={this.props.classes.wrapper}
          >
            <Grid item={true} xs={11} className={this.props.classes.gridWrapper}>
              <div
                className={(this.props.activeList.length > 1) && (activeListIndex >= 0)
                  && this.props.classes.listBorder}
                id={this.setIdsInGroup(activeListIndex)}
              >
                <ListItem
                  className={this.state.isItemActive ? this.props.classes.active : this.props.classes.formComponent}
                  onClick={this.handleSetActive}
                >
                  {this.state.isEditMode ?
                    <Grid item={true} xs={12} className={this.props.classes.activeWrapper}>
                      <EditModalContent
                        component={this.props.component}
                        language={this.props.language}
                        handleComponentUpdate={this.handleComponentUpdate}
                      />
                    </Grid>
                    :
                    <div className={this.props.classes.textPrimaryDark}>
                      {this.state.component.title ?
                        truncate(getTextResource(this.props.component.title, this.props.textResources), 80)
                        : this.props.component.component}
                    </div>
                  }
                  <span className={this.props.classes.textSecondaryDark + ' ' + this.props.classes.caption}>
                    {this.props.component.component}
                  </span>
                </ListItem>
              </div>
            </Grid>
            {!this.state.isEditMode &&
              < Grid
                xs={true}
                item={true}
                className={this.state.isItemActive ? this.props.classes.gridForBtnActive
                  : this.props.classes.gridForBtn}
              >
                {this.state.listItem.firstInActiveList &&
                  <IconButton
                    type='button'
                    className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                    onClick={this.handleComponentDelete}
                  >
                    <i className='ai ai-circletrash' />
                  </IconButton>
                }
                {!(this.state.activeList.length > 1) &&
                  <IconButton
                    type='button'
                    className={this.props.classes.formComponentsBtn}
                    onClick={this.handleOpenEdit}
                  >
                    <i className='reg reg-edit' />
                  </IconButton>
                }
              </Grid>}
            {this.state.isEditMode &&
              <Grid
                xs={true}
                item={true}
                className={this.props.classes.gridForBtn}
              >
                <IconButton
                  type='button'
                  className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                  onClick={this.handleDiscard}
                >
                  <i className='ai ai-circlecancel' />
                </IconButton>
                <IconButton
                  type='button'
                  className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                  onClick={this.handleSave}
                >
                  <i className='ai ai-circlecheck' />
                </IconButton>
              </Grid>}
          </Grid>
        </Grid>
      </>
    );
  }
}

const makeMapStateToProps = () => {
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const mapStateToProps = (
    state: IAppState,
    props: IEditContainerProvidedProps,
  ): IEditContainerProps => {
    return {
      component: props.component,
      components: GetLayoutComponentsSelector(state),
      id: props.id,
      order: props.order,
      handler: props.handler,
      activeList: state.formDesigner.layout.activeList,
      firstInActiveList: props.firstInActiveList,
      dataModel: state.appData.dataModel.model,
      textResources: state.appData.textResources.resources,
      language: state.appData.language.language,
      classes: props.classes,
    };
  };
  return mapStateToProps;
};

export const EditContainer = withStyles(styles, { withTheme: true })(connect(makeMapStateToProps)(Edit));
