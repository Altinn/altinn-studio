import {
  createStyles, Grid, IconButton, List, ListItem, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import {getTextResource, truncate} from '../utils/language';
import '../styles/index.css';

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
    backgroundColor: altinnTheme.palette.secondary.light,
    border: '1.5px dotted ' + altinnTheme.palette.secondary.dark,
    color: altinnTheme.palette.primary.dark + '!mportant',
    padding: '10px 12px 14px 12px',
    '&:hover': {
      backgroundColor: '#fff',
      boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
    },
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.palette.primary.dark,
    paddingLeft: '0',
    marginTop: '0.1em',
    outline: 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  specialBtn: {
    fontSize: '0.6em !important',
  },
  gridForBtn: {
    visibility: 'hidden',
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  gridForBtnActive: {
    visibility: 'visible',
    paddingTop: '8px',
    paddingBottom: '8px',
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
    color: altinnTheme.palette.primary.dark + '!important',
  },
  textSecondaryDark: {
    color: altinnTheme.palette.secondary.dark + '!important',
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
  classes: any;
}

export interface IEditContainerProps extends IEditContainerProvidedProps {
  id: string;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
  language: any;
}

export interface IEditContainerState {
  component: IFormComponent;
  isEditModalOpen: boolean;
  isItemActive: boolean;
  isEditMode: boolean;
}

class Edit extends React.Component<IEditContainerProps, IEditContainerState> {
  constructor(_props: IEditContainerProps, _state: IEditContainerState) {
    super(_props, _state);
    this.state = {
      isEditModalOpen: false,
      isItemActive: false,
      isEditMode: false,
      component: _props.component,
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
    FormDesignerActionDispatchers.deleteFormComponent(this.props.id);
    e.stopPropagation();
  }

  public handleOpenEdit = (): void => {
    this.setState({
      isItemActive: true,
      isEditMode: true,
    });
  }

  public handleOpenModal = (): void => {
    if (!this.state.isEditMode) {
      this.setState({
        isItemActive: !this.state.isItemActive,
      });
    }
  }

  public handleSave = (): void => {
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
    FormDesignerActionDispatchers.updateFormComponent(
      callbackComponent,
      this.props.id,
    );
  }

  public handleTitleChange = (e: any): void => {
    this.state.component.title = e.value;
  }

  public searchForText = (e: any): void => {
    this.state.component.title = e.target.value;
  }

  public render(): JSX.Element {
    return (
      <>
        <Grid xs={12} sm={true} container={true}>
          <Grid
            container={true}
            xs={true}
            direction={'row'}
            spacing={0}
            className={this.props.classes.wrapper}
          >
            <Grid item={true} xs={11}>
              <List>
                <ListItem
                  className={this.state.isItemActive ? this.props.classes.active : this.props.classes.formComponent}
                  onClick={this.handleOpenModal}
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
            {!this.state.isEditMode &&
              <Grid
                xs={true}
                container={true}
                direction={'column'}
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
                <IconButton
                  type='button'
                  className={this.props.classes.formComponentsBtn}
                  onClick={this.handleOpenEdit}
                >
                  <i className='reg reg-edit' />
                </IconButton>
              </Grid>}
            {this.state.isEditMode &&
              <Grid
                xs={true}
                container={true}
                direction={'column'}
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

const mapsStateToProps = (
  state: IAppState,
  props: IEditContainerProvidedProps,
): IEditContainerProps => {
  return {
    component: props.component,
    id: props.id,
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
    language: state.appData.language.language,
    classes: props.classes,
  };
};

export const EditContainer = withStyles(styles, { withTheme: true })(connect(mapsStateToProps)(Edit));
