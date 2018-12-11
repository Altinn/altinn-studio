import { createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import {getTextResource, truncate} from '../../utils/language';
import { SelectDataModelComponent } from './SelectDataModelComponent';

const styles = createStyles({
  inputHelper: {
    marginTop: '1em',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
});
const customInput = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
  option: (provided: any) => ({
    ...provided,
    whiteSpace: 'pre-wrap',
  }),
};

export interface IEditModalContentProps {
  component: FormComponentType;
  dataModel?: IDataModelFieldElement[];
  textResources?: ITextResource[];
  saveEdit?: (updatedComponent: FormComponentType) => void;
  cancelEdit?: () => void;
  handleComponentUpdate?: (updatedComponent: FormComponentType) => void;
  language: any;
  classes: any;
}

export interface IEditModalContentState {
  component: IFormComponent;
}

class EditModalContentComponent extends React.Component<IEditModalContentProps, IEditModalContentState> {
  constructor(_props: IEditModalContentProps, _state: IEditModalContentState) {
    super(_props, _state);

    this.state = {
      component: _props.component,
    };
  }

  public handleDisabledChange = (e: any): void => {
    this.setState({
      component: {
        ...this.state.component,
        disabled: e.target.checked,
      },
    });
  }

  public handleRequiredChange = (e: any): void => {
    this.setState({
      component: {
        ...this.state.component,
        required: e.target.checked,
      },
    });
  }

  public handleTitleChange = (e: any): void => {
    const updatedComponent = this.props.component;
    updatedComponent.title = e.value;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleAddOption = () => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options.push({
      label: this.props.language.general.label,
      value: this.props.language.general.value,
    });
    this.setState({
      component: updatedComponent,
    });
  }

  public handleRemoveOption = (index: number) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options.splice(index, 1);
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateOptionLabel = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].label = event.target.value;
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateOptionValue = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].value = event.target.value;
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateHeaderSize = (event: any) => {
    const updatedComponent: IFormHeaderComponent = this.props.component as IFormHeaderComponent;
    updatedComponent.size = event.value;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleDataModelChange = (selectedDataModelElement: any): void => {
    const updatedComponent = this.props.component;
    updatedComponent.dataModelBinding = selectedDataModelElement;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleDescriptionChange = (selectedText: any): void => {
    const updatedComponent = this.props.component;
    updatedComponent.description = selectedText.value;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public getTextKeyFromDataModel = (dataBindingName: string): string => {
    const element: IDataModelFieldElement = this.props.dataModel.find((elem) =>
      elem.DataBindingName === dataBindingName);
    return element.Texts.Label;
  }

  public renderSelectDataModelBinding(): JSX.Element {
    return (
      <div>
        <Typography
          gutterBottom={false}
          className={this.props.classes.inputHelper}
        >
          {this.props.language.ux_editor.modal_properties_data_model_helper}
        </Typography>
        <SelectDataModelComponent
          selectedElement={this.props.component.dataModelBinding}
          onDataModelChange={this.handleDataModelChange}
          language={this.props.language}
          noOptionsMessage={this.noOptionsMessage}
        />
      </div>
    );
  }

  public renderSelectTextFromResources = (
    labelText: string,
    onChangeFunction: (e: any) => void,
    placeholder?: string,
    truncateLimit: number = 80,
    createNewTextAllowed: boolean = true,
  ): JSX.Element => {
    const textRecources: any = [];
    this.props.textResources.map((resource, index) => {
      const option = truncate(resource.value, truncateLimit);
      textRecources.push({ value: resource.id, label: option.concat('\n(', resource.id, ')') });
    });
    return (
      <div>
        <Typography gutterBottom={false} className={this.props.classes.inputHelper}>
          {this.props.language.ux_editor[labelText]}
        </Typography>
        {createNewTextAllowed ?
          <CreatableSelect
            styles={customInput}
            options={textRecources}
            defaultValue={''}
            onChange={onChangeFunction}
            isClearable={true}
            placeholder={placeholder ?
              truncate(getTextResource(placeholder, this.props.textResources), 40)
              : this.props.language.general.search}
            formatCreateLabel={this.formatCreateTextLabel}
            noOptionsMessage={this.noOptionsMessage}
          />
        :
          <Select
            styles={customInput}
            options={textRecources}
            defaultValue={''}
            onChange={onChangeFunction}
            isClearable={true}
            placeholder={placeholder ?
              truncate(getTextResource(placeholder, this.props.textResources), 40)
              : this.props.language.general.search}
            noOptionsMessage={this.noOptionsMessage}
          />
        }
      </div>
    );
  }

  public renderComponentSpecificContent(): JSX.Element {
    switch (this.props.component.component) {
      case 'Header': {
        const sizes = [
          { value: 'S', label: this.props.language.ux_editor.modal_header_type_h4 },
          { value: 'M', label: this.props.language.ux_editor.modal_header_type_h3 },
          { value: 'L', label: this.props.language.ux_editor.modal_header_type_h2 },
        ];
        return (
          <Grid
            container={true}
            spacing={0}
            direction={'column'}
          >
          {this.renderSelectTextFromResources('modal_properties_header_helper',
            this.handleTitleChange, this.state.component.title)}
            <Grid item={true} xs={12}>
              <Typography
                gutterBottom={false}
                className={this.props.classes.inputHelper}
              >
                {this.props.language.ux_editor.modal_header_type_helper}
              </Typography>
              <Select
                styles={customInput}
                defaultValue={this.state.component.size ?
                    sizes.find((size) => size.value === this.state.component.size ) :
                    sizes[0]}
                onChange={this.handleUpdateHeaderSize}
                options={sizes}
              />
            </Grid>
          </Grid>
        );
      }
      case 'Input': {
        return (
          <Grid item={true} xs={12}>
            {this.renderSelectDataModelBinding()}
            {this.renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange, this.props.component.title)}
            {this.renderSelectTextFromResources('modal_properties_description_helper',
              this.handleDescriptionChange, this.props.component.description)}
          </Grid>
        );
      }
      case 'Paragraph': {
        return (
          this.renderSelectTextFromResources('modal_properties_paragraph_helper',
            this.handleTitleChange, this.props.component.title)
        );
      }
      case 'RadioButtons': {
        const component: IFormRadioButtonComponent = this.state.component as IFormRadioButtonComponent;
        return (
          <div className='form-group a-form-group mt-2'>
            <h2 className='a-h4'>
              {this.props.language.ux_editor.modal_options}
            </h2>
            <div className='row align-items-center'>
              <div className='col-5'>
                <label className='a-form-label'>
                  {this.props.language.general.label}
                </label>
              </div>
              <div className='col-5'>
                <label className='a-form-label'>
                  {this.props.language.general.value}
                </label>
              </div>
            </div>
            {component.options.map((option, index) => (
              <div key={index} className='row align-items-center'>
                <div className='col-5'>
                  <label htmlFor={'editModal_radiolabel-' + index} className='a-form-label sr-only'>
                    {this.props.language.ux_editor.modal_text}
                  </label>
                  <select
                    id={'editModal_radiolabel-' + index}
                    className='custom-select a-custom-select'
                    onChange={this.handleUpdateOptionLabel.bind(this, index)}
                    value={option.label}
                  >}
                    <option key={'empty'} value={''}>
                      {this.props.language.general.choose_label}
                    </option>
                    {this.renderTextResourceOptions()}
                  </select>
                </div>
                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionValue.bind(this, index)}
                    value={option.value}
                    className='form-control'
                    type='text'
                  />
                </div>
                <div className='col-2'>
                  <button
                    type='button'
                    className='a-btn a-btn-icon'
                    onClick={this.handleRemoveOption.bind(this, index)}
                  >
                    <i className='ai ai-circle-exit a-danger ai-left' />
                  </button>
                </div>
              </div>
            ))}
            <div className='row align-items-center mb-1'>
              <div className='col-4 col'>
                <button type='button' className='a-btn' onClick={this.handleAddOption}>
                  {this.props.language.ux_editor.modal_new_option}
                </button>
              </div>
              <div />
            </div>
          </div>
        );
      }
      case 'Dropdown': {
        const component: IFormDropdownComponent = this.state.component as IFormDropdownComponent;
        return (
          <div className='form-group a-form-group mt-2'>
            <h2 className='a-h4'>
              {this.props.language.ux_editor.modal_options}
            </h2>
            <div className='row align-items-center'>
              <div className='col-5'>
                <label className='a-form-label'>
                  {this.props.language.general.label}
                </label>
              </div>
              <div className='col-5'>
                <label className='a-form-label'>
                  {this.props.language.general.value}
                </label>
              </div>
            </div>

            {component.options.map((option, index) => (
              <div key={index} className='row align-items-center'>
                <div className='col-5'>
                  <label htmlFor={'editModal_dropdownlabel-' + index} className='a-form-label sr-only'>
                    {this.props.language.ux_editor.modal_text}
                  </label>
                  <select
                    id={'editModal_dropdownlabel-' + index}
                    className='custom-select a-custom-select'
                    onChange={this.handleUpdateOptionLabel.bind(this, index)}
                    value={option.label}
                  >}
                    <option key={'empty'} value={''}>
                      {this.props.language.general.choose_label}
                    </option>
                    {this.renderTextResourceOptions()}
                  </select>
                </div>

                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionValue.bind(this, index)}
                    value={option.value}
                    className='form-control'
                    type='text'
                  />
                </div>

                <div className='col-2'>
                  <button
                    type='button'
                    className='a-btn a-btn-icon'
                    onClick={this.handleRemoveOption.bind(this, index)}
                  >
                    <i className='ai ai-circle-exit a-danger ai-left' />
                  </button>
                </div>
              </div>
            ))}

            <div className='row align-items-center mb-1'>
              <div className='col-4 col'>
                <button type='button' className='a-btn' onClick={this.handleAddOption}>
                  {this.props.language.ux_editor.modal_new_option}
                </button>
              </div>
              <div />
            </div>
          </div>
        );
      }

      case 'Submit': {
        return (
          <div className='form-group a-form-group'>
            <label className='a-form-label'>
              {this.props.language.ux_editor.modal_text_key}
            </label>
            <input
              type='text'
              disabled={true}
              value={this.props.component.textResourceId}
              className='form-control'
            />
          </div>
        );
      }

      default: {
        return null;
      }
    }
  }

  public renderTextResourceOptions = (): JSX.Element[] => {
    if (!this.props.textResources) {
      return null;
    }

    return (
      this.props.textResources.map((resource, index) => {
        const option = truncate(resource.value, 60);
        return (
          <option key={index} value={resource.id} title={resource.value}>
            {option}
          </option>
        );
      }));
  }

  public render(): JSX.Element {
    return (
      <>
        {this.renderComponentSpecificContent()}
      </>
    );
  }

  private formatCreateTextLabel = (textToCreate: string): string => {
    return this.props.language.general.create.concat(' ', textToCreate);
  }

  private noOptionsMessage = (): string => {
    return this.props.language.general.no_options;
  }
}

const mapStateToProps = (
  state: IAppState,
  props: IEditModalContentProps,
): IEditModalContentProps => {
  return {
    language: state.appData.language.language,
    textResources: state.appData.textResources.resources,
    classes: props.classes,
    ...props,
  };
};

export const EditModalContent = withStyles(styles, { withTheme: true })
  (connect(mapStateToProps)(EditModalContentComponent));
