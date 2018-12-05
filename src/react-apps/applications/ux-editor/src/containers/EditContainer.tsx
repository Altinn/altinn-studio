import {
  createStyles, FormControl, Grid, IconButton, List, ListItem, MenuItem, MuiThemeProvider, Select,
  TextField, Theme, Typography, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { EditModalContent } from '../components/config/EditModalContent';
import '../styles/index.css';

const styles = ((theme: Theme) => createStyles({
  active: {
    backgroundColor: '#fff',
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
  formComponent: {
    backgroundColor: altinnTheme.palette.secondary.light,
    border: '1.5px dotted ' + altinnTheme.palette.secondary.dark,
    color: altinnTheme.palette.primary.dark + '!mportant',
  },
  formComponentsBtn: {
    fontSize: '0.8em',
    fill: altinnTheme.palette.primary.dark,
    paddingLeft: 0,
    marginTop: '0.1em',
    outline: 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  gridForBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  inputHelper: {
    marginTop: '1em',
  },
}));
export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
  classes: any;
}

export interface IEditContainerProps extends IEditContainerProvidedProps {
  component: IFormComponent;
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
    FormDesignerActionDispatchers.updateFormComponent(
      updatedComponent,
      this.props.id,
    );
  }

  public handleComponentDelete = (e: any): void => {
    FormDesignerActionDispatchers.deleteFormComponent(this.props.id);
    e.stopPropagation();
  }

  public handleOpenEdit = (): void => {
    this.setState({
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

  public handleCloseModal = (): void => {
    this.setState({
      isItemActive: false,
      isEditMode: false,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.handleComponentUpdate(callbackComponent);
    this.handleCloseModal();
  }

  public handleTitleChange = (e: any): void => {
    this.props.component.title = e.target.value;
  }
  public handleSizeChange = (e: any) => {
    this.props.component.size = e.target.value;
  }

  public renderComponentSpecificContent(): JSX.Element {
    switch (this.props.component.component) {
      case 'Header': {
        return (
          <Grid item={true} xs={true} container={true} direction={'column'} spacing={0}>
            <Typography variant='h5' gutterBottom={true} className={this.props.classes.inputHelper}>
              {this.props.language.ux_editor.modal_header_type_helper}
            </Typography>
            <FormControl>
              <Select
                value={this.props.component.size ? this.props.component.size : 'S'}
                onChange={this.handleSizeChange}
                disableUnderline={true}
                inputProps={{
                  id: 'size-select',
                  name: 'header size',
                }}
              >
                <MenuItem key={0} value={'S'}>
                  {this.props.language.ux_editor.modal_header_type_h3}
                </MenuItem>
                <MenuItem key={1} value={'M'}>
                  {this.props.language.ux_editor.modal_header_type_h2}
                </MenuItem>
                <MenuItem key={2} value={'L'}>
                  {this.props.language.ux_editor.modal_header_type_h1}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        );
      }
      case 'Input': {
        return (
          <span>helo from input?</span>
        );
      }
      default: {
        return null;
      }
    }
  }

  public searchForText = (e: any): void => {
    this.state.component.title = e.target.value;
  }

  public renderTextResourceOptions = (): JSX.Element[] => {
    if (!this.props.textResources) {
      return null;
    }

    return (
      this.props.textResources.map((resource, index) => {
        const option = this.truncate(resource.value);
        return (
          <MenuItem key={index} value={resource.id} name={resource.value}>
            {option}
          </MenuItem>
        );
      }));
  }

  public truncate = (s: string) => {
    if (s.length > 60) {
      return s.substring(0, 60);
    } else {
      return s;
    }
  }

  public render(): JSX.Element {
    return (
      <>
        <MuiThemeProvider theme={altinnTheme}>
          <Modal
            isOpen={this.state.isEditModalOpen}
            onRequestClose={this.handleCloseModal}
            ariaHideApp={false}
            contentLabel={'Input edit'}
            className='react-modal a-modal-content-target a-page a-current-page modalPage'
            overlayClassName='react-modal-overlay '
          >
            <EditModalContent
              component={this.props.component}
              saveEdit={this.handleSaveChange}
              cancelEdit={this.handleCloseModal}
              dataModel={this.props.dataModel}
              textResources={this.props.textResources}
              language={this.props.language}
            />
          </Modal>
          <Grid item={true} xs={12} sm={true} container={true}>
            <Grid item={true} xs={true} container={true} direction={'row'} spacing={0}>
              <Grid item={true} xs={11}>
                <List>
                  <ListItem
                    className={this.state.isItemActive ? this.props.classes.active : this.props.classes.formComponent}
                    onClick={this.handleOpenModal}
                  >
                    {this.state.isEditMode ?
                      <div>
                        <Grid item={true} xs={true} container={true} direction={'column'} spacing={0}>
                          <Typography variant='h5' gutterBottom={true} className={this.props.classes.inputHelper}>
                            {this.props.language.ux_editor.modal_properties_data_model_helper}
                          </Typography>
                          <Select
                            children={this.props.textResources}
                            value={this.state.component.customType === 'Standard' ?
                              this.state.component.textResourceId : this.state.component.title}
                            onChange={this.searchForText}
                          />
                          <FormControl>
                            <Select
                              value={this.state.component.customType === 'Standard' ?
                                this.state.component.textResourceId : this.state.component.title}
                              onChange={this.handleTitleChange}
                              disabled={this.state.component.customType === 'Standard'}
                              disableUnderline={true}
                              inputProps={{
                                id: 'text-select',
                                name: 'text',
                              }}
                            >
                              <MenuItem value='null' disabled={true}>
                                {this.props.language.ux_editor.modal_text_input}
                              </MenuItem>
                              {this.renderTextResourceOptions()}
                            </Select>
                          </FormControl>
                        </Grid>
                        {this.renderComponentSpecificContent()}
                      </div>
                      :
                      <div className='subtitle2'>
                        {this.props.children}
                      </div>
                    }
                  </ListItem>
                </List>
              </Grid>
              {this.state.isItemActive && !this.state.isEditMode &&
                <Grid
                  item={true}
                  xs={true}
                  container={true}
                  direction={'column'}
                  className={this.props.classes.gridForBtn}
                >
                  <IconButton
                    type='button'
                    className={this.props.classes.formComponentsBtn}
                    onClick={this.handleComponentDelete}
                  >
                    <i className='reg reg-trash' />
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
                  item={true}
                  xs={true}
                  container={true}
                  direction={'column'}
                  className={this.props.classes.gridForBtn}
                >
                  <IconButton
                    type='button'
                    className={this.props.classes.formComponentsBtn}
                    onClick={this.handleCloseModal}
                  >
                    <i className='reg reg-trash' />
                  </IconButton>
                  <IconButton
                    type='button'
                    className={this.props.classes.formComponentsBtn}
                    onClick={this.handleCloseModal}
                  >
                    <i className='reg reg-check' />
                  </IconButton>
                </Grid>}
            </Grid>
          </Grid>
        </MuiThemeProvider>
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
