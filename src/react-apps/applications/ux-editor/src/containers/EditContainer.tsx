import {
  createStyles, Grid, IconButton, List, ListItem,
  Typography, withStyles,
} from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import CreatableSelect from 'react-select/lib/Creatable';
import Select from 'react-select';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import '../styles/index.css';

const styles = createStyles({
  active: {
    backgroundColor: '#fff',
    boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.25)',
  },
  formComponent: {
    backgroundColor: altinnTheme.palette.secondary.light,
    border: '1.5px dotted ' + altinnTheme.palette.secondary.dark,
    color: altinnTheme.palette.primary.dark + '!mportant',
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
  marginBottom: {
    paddingBottom: '23px',
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
const customInput = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  })
};

export interface IEditContainerProvidedProps {
  component: IFormComponent;
  id: string;
  classes: any;
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
    this.handleComponentUpdate(callbackComponent);
  }

  public handleTitleChange = (e: any): void => {
    this.state.component.title = e.value;
  }
  public handleSizeChange = (e: any): void => {
    this.state.component.size = e.value;
  }

  public renderComponentSpecificContent(): JSX.Element {
    switch (this.props.component.component) {
      case 'Header': {
        const sizes = [
          { value: 'S', label: this.props.language.ux_editor.modal_header_type_h3 },
          { value: 'M', label: this.props.language.ux_editor.modal_header_type_h2 },
          { value: 'L', label: this.props.language.ux_editor.modal_header_type_h1 }
        ];
        return (
          <Grid item={true} xs={true} container={true} direction={'column'} spacing={0}
            className={this.props.classes.marginBottom}>
            <Typography gutterBottom={false} className={this.props.classes.inputHelper}>
              {this.props.language.ux_editor.modal_header_type_helper}
            </Typography>
            <Select
              styles={customInput}
              defaultValue={sizes[0]}
              onChange={this.handleSizeChange}
              options={sizes}
            />
          </Grid>
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

  public getTextResource = (resourceKey: string): string => {
    const textResource = this.props.textResources.find((resource) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  }

  public truncate = (s: string, size: number) => {
    if (s.length > size) {
      return (s.substring(0, size) + '...');
    } else {
      return s;
    }
  }

  public render(): JSX.Element {
    const textRecources: any = [];
    this.props.textResources.map((resource, index) => {
      const option = this.truncate(resource.value, 60);

      textRecources.push({ value: resource.id, label: option })
    });

    return (
      <>
        <Grid item={true} xs={12} sm={true} container={true}>
          <Grid item={true} xs={true} container={true} direction={'row'} spacing={0}
            className={this.props.classes.wrapper}>
            <Grid item={true} xs={11}>
              <List>
                <ListItem
                  className={this.state.isItemActive ? this.props.classes.active : this.props.classes.formComponent}
                  onClick={this.handleOpenModal}
                >
                  {this.state.isEditMode ?
                    <Grid item={true} xs={11}>
                      <span className={this.props.classes.inputHelper}>
                        {this.props.language.ux_editor.modal_properties_data_model_helper}
                      </span>
                      <span className={this.props.classes.textSecondaryDark + ' ' + this.props.classes.caption}>
                        {this.props.component.component}
                      </span>
                      <CreatableSelect
                        styles={customInput}
                        options={textRecources}
                        defaultValue={''}
                        onChange={this.handleTitleChange}
                        isClearable
                        placeholder={this.state.component.title ?
                          this.truncate(this.getTextResource(this.state.component.title), 40)
                          : this.props.language.general.search}
                        formatCreateLabel={() => this.props.language.general.create_new}
                        noOptionsMessage={() => this.props.language.general.no_options}
                      />
                      {this.renderComponentSpecificContent()}
                    </Grid>
                    :
                    <div className={this.props.classes.textPrimaryDark}>
                      {this.state.component.title ? this.getTextResource(this.props.component.title) : this.props.component.component}
                      <span className={this.props.classes.textSecondaryDark + ' ' + this.props.classes.caption}>
                        {this.props.component.component}
                      </span>
                    </div>
                  }
                </ListItem>
              </List>
            </Grid>
            {!this.state.isEditMode &&
              <Grid
                item={true}
                xs={true}
                container={true}
                direction={'column'}
                className={this.state.isItemActive? this.props.classes.gridForBtnActive
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
                item={true}
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
