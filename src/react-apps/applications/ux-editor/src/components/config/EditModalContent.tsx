import { Grid } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import { getTextResource, truncate } from '../../utils/language';
import { renderPropertyLabel, renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';
import { ICodeListOption, SelectionEdit } from './SelectionEditComponent';

export const customInput = {
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
  codeListResources?: ICodeListListElement[];
  saveEdit?: (updatedComponent: FormComponentType) => void;
  cancelEdit?: () => void;
  handleComponentUpdate?: (updatedComponent: FormComponentType) => void;
  language: any;
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
    updatedComponent.title = e ? e.value : null;
    this.setState((state) => {
      return {
        ...state,
        component: updatedComponent,
      };
    });
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleParagraphChange = (e: any): void => {
    const textObject: any = e.target;
    this.handleTitleChange(textObject);
  }

  public handleAddOption = () => {
    const updatedComponent: IFormComponent = (this.state.component);
    updatedComponent.options.push({
      label: this.props.language.general.label,
      value: this.props.language.general.value,
    });
    this.setState({
      component: {
        ...this.state.component,
        options: updatedComponent.options,
      },
    });
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleRemoveOption = (index: number) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options.splice(index, 1);
    this.setState({
      component: {
        ...this.state.component,
        options: updatedComponent.options,
      },
    });
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleUpdateOptionLabel = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].label = event.target.value;
    this.setState({
      component: {
        ...this.state.component,
        options: updatedComponent.options,
      },
    });
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleUpdateOptionValue = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].value = event.target.value;
    this.setState({
      component: {
        ...this.state.component,
        options: updatedComponent.options,
      },
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
    updatedComponent.description = selectedText ? selectedText.value : null;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public getTextKeyFromDataModel = (dataBindingName: string): string => {
    const element: IDataModelFieldElement = this.props.dataModel.find((elem) =>
      elem.DataBindingName === dataBindingName);
    return element.Texts.Label;
  }

  public handleCodeListChange = (option: ICodeListOption): void => {
    const updatedComponent = this.props.component;
    updatedComponent.codeListId = option ? option.value.codeListName : undefined;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handlePreselectedOptionChange = (event: any): void => {
    const updatedComponent = { ...this.props.component as IFormCheckboxComponent | IFormRadioButtonComponent };
    updatedComponent.preselectedOptionIndex = event.target.value as number;
    this.props.handleComponentUpdate(updatedComponent);
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
            {renderSelectTextFromResources('modal_properties_header_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.state.component.title, null, false)}
            <Grid item={true} xs={12}>
              {renderPropertyLabel(this.props.language.ux_editor.modal_header_type_helper)}
              <Select
                styles={customInput}
                defaultValue={this.state.component.size ?
                  sizes.find((size) => size.value === this.state.component.size) :
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
            {renderSelectDataModelBinding(
              this.props.component.dataModelBinding,
              this.handleDataModelChange,
              this.props.language)}
            {renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.props.component.title)}
            {renderSelectTextFromResources('modal_properties_description_helper',
              this.handleDescriptionChange,
              this.props.textResources,
              this.props.language,
              this.props.component.description)}
          </Grid>
        );
      }
      case 'Paragraph': {
        return (
          <Grid>
            {renderSelectTextFromResources('modal_properties_paragraph_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.props.component.title,
              null,
              false)}
            {renderPropertyLabel(this.props.language.ux_editor.modal_properties_paragraph_edit_helper)}
            <textarea
              value={getTextResource(this.state.component.title, this.props.textResources)}
              style={{ width: '100%' }}
              rows={4}
              className='form-control'
              onChange={this.handleParagraphChange}
            />
          </Grid>
        );
      }
      case 'Checkboxes': {
        return (
          <SelectionEdit
            type={'checkboxes'}
            component={this.state.component as IFormCheckboxComponent}
            handleAddOption={this.handleAddOption}
            handleCodeListChanged={this.handleCodeListChange}
            handleDescriptionChange={this.handleDescriptionChange}
            handlePreselectedOptionChange={this.handlePreselectedOptionChange}
            handleRemoveOption={this.handleRemoveOption}
            handleTitleChange={this.handleTitleChange}
            handleUpdateOptionLabel={this.handleUpdateOptionLabel}
            handleUpdateOptionValue={this.handleUpdateOptionValue}
            handleDataModelChange={this.handleDataModelChange}
          />
        );
      }
      case 'RadioButtons': {
        return (
          <SelectionEdit
            type={'radiobuttons'}
            component={this.state.component as IFormRadioButtonComponent}
            handleAddOption={this.handleAddOption}
            handleCodeListChanged={this.handleCodeListChange}
            handleDescriptionChange={this.handleDescriptionChange}
            handlePreselectedOptionChange={this.handlePreselectedOptionChange}
            handleRemoveOption={this.handleRemoveOption}
            handleTitleChange={this.handleTitleChange}
            handleUpdateOptionLabel={this.handleUpdateOptionLabel}
            handleUpdateOptionValue={this.handleUpdateOptionValue}
            handleDataModelChange={this.handleDataModelChange}
          />
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
}

const mapStateToProps = (
  state: IAppState,
  props: IEditModalContentProps,
): IEditModalContentProps => {
  return {
    language: state.appData.language.language,
    textResources: state.appData.textResources.resources,
    codeListResources: state.appData.codeLists.codeLists,
    ...props,
  };
};

export const EditModalContent = connect(mapStateToProps)(EditModalContentComponent);
