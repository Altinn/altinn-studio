import {
  createStyles, Grid, IconButton, List, ListItem, withStyles,
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
  formComponent: {
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
    border: '1.5px dotted ' + altinnTheme.palette.secondary.dark,
    color: altinnTheme.altinnPalette.primary.blue + '!mportant',
    padding: '10px 12px 14px 12px',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blue,
    paddingLeft: '0',
    marginTop: '0.1em',
    outline: 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  specialBtn: {
    fontSize: '0.6em !important',
    paddingLeft: '4px',
  },
  gridForBtn: {
    visibility: 'hidden',
    paddingTop: '8px',
    paddingBottom: '8px',
    marginLeft: '10px',
  },
  gridForBtnActive: {
    visibility: 'visible',
    paddingTop: '8px',
    paddingBottom: '8px',
    marginLeft: '10px',
  },
  inputHelper: {
    marginTop: '1em',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  caption: {
    position: 'absolute',
    right: '12px',
    top: '6px',
    fontSize: '1.2rem',
  },
  textPrimaryDark: {
    color: altinnTheme.altinnPalette.primary.blue + '!important',
  },
  textSecondaryDark: {
    color: altinnTheme.altinnPalette.primary.grey + '!important',
  },
  wrapper: {
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
  hideActions: boolean;
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
      hideActions: false,
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
      });
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
<<<<<<< HEAD
    this.state.component.size = this.props.component.size;
    this.handleComponentUpdate(callbackComponent);
=======
    FormDesignerActionDispatchers.updateFormComponent(
      callbackComponent,
      this.props.id,
    );
>>>>>>> master
  }

  public handleTitleChange = (e: any): void => {
    this.state.component.title = e.value;
  }

  public searchForText = (e: any): void => {
    this.state.component.title = e.target.value;
  }

  public render(): JSX.Element {
<<<<<<< HEAD
    const textRecources: any = [];
    this.props.textResources.map((resource, index) => {
      const option = this.truncate(resource.value, 80);

      textRecources.push({ value: resource.id, label: option.concat('\n(', resource.id, ')') });
    });
=======
>>>>>>> master
    return (
      <>
        <Grid container={true}>
          <Grid
            container={true}
            direction={'row'}
            spacing={0}
            className={this.props.classes.wrapper}
          >
            <Grid item={true} xs={11}>
              <List>
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
              </List>
            </Grid>
            {!this.state.isEditMode && this.state.listItem.firstInActiveList &&
              < Grid
                xs={true}
                item={true}
                className={this.state.isItemActive ? this.props.classes.gridForBtnActive
                  : this.props.classes.gridForBtn}
              >
                <IconButton
                  type='button'
                  className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                  onClick={this.handleComponentDelete}
                >
                  <i className='ai ai-circletrash' />
                </IconButton>
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
