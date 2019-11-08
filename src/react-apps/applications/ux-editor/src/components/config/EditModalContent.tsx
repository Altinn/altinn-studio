import { Grid, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import AltinnCheckBox from '../../../../shared/src/components/AltinnCheckBox';
import AltinnInputField from '../../../../shared/src/components/AltinnInputField';
import AltinnRadio from '../../../../shared/src/components/AltinnRadio';
import AltinnRadioGroup from '../../../../shared/src/components/AltinnRadioGroup';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { getTextResource, truncate } from '../../utils/language';
import { renderPropertyLabel, renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';
import { AddressKeys, getTextResourceByAddressKey } from '../advanced/AddressComponent';
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

export const disabledInput = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
    background: 'repeating-linear-gradient(135deg, #efefef, #efefef 2px, #fff 3px, #fff 5px)',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#000',
  }),
};

const styles = {
  gridItem: {
    marginTop: '24px',
  },
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: 'auto',
    color: '#000000',
  },
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
  classes: any;
  thirdPartyComponents?: any;
}

export interface IEditModalContentState {
  component: IFormComponent;
}

export class EditModalContentComponent extends React.Component<IEditModalContentProps, IEditModalContentState> {
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

  public handleTextResourceBindingChange = (e: any, key: string): void => {
    const updatedComponent = this.state.component;
    updatedComponent.textResourceBindings[key] = e ? e.value : null;
    this.setState({
      component: updatedComponent,
    });
    this.props.handleComponentUpdate(updatedComponent);
  }

  public handleTitleChange = (e: any): void => {
    const updatedComponent = this.state.component;
    updatedComponent.textResourceBindings.title = e ? e.value : null;
    this.setState({
      component: updatedComponent,
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

  public handleDescriptionChange = (selectedText: any): void => {
    const updatedComponent = this.props.component;
    updatedComponent.textResourceBindings.description
      = selectedText ? selectedText.value : null;
    this.setState({
      component: updatedComponent,
    });
    this.props.handleComponentUpdate(updatedComponent);
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
    switch (this.props.component.type) {
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
              this.state.component.textResourceBindings.title)}
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
      case 'Datepicker':
      case 'Input': {
        return (
          <Grid item={true} xs={12}>
            {renderSelectDataModelBinding(
              this.props.component.dataModelBindings,
              this.handleDataModelChange,
              this.props.language)}
            {renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.props.component.textResourceBindings.title)}
            {renderSelectTextFromResources('modal_properties_description_helper',
              this.handleDescriptionChange,
              this.props.textResources,
              this.props.language,
              this.props.component.textResourceBindings.description)}
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
              this.props.component.textResourceBindings.title,
            )}
            {false && renderPropertyLabel(this.props.language.ux_editor.modal_properties_paragraph_edit_helper)}
            {false && <textarea
              value={getTextResource(
                this.state.component.textResourceBindings.title, this.props.textResources)}
              style={{ width: '100%' }}
              rows={4}
              className='form-control'
              onChange={this.handleParagraphChange}
            />
            }
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
                    <i className='fa fa-circle-exit a-danger ai-left' />
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

      case 'Button': {
        return (
          <Grid item={true} xs={12}>
            <Typography style={styles.inputHelper}>
              {getLanguageFromKey('ux_editor.modal_properties_button_type_helper', this.props.language)}
            </Typography>
            <Select
              styles={disabledInput}
              value={getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language)}
              placeholder={getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language)}
              isDisabled={true}
            />
            {renderSelectTextFromResources('modal_properties_button_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language))}
          </Grid>
        );
      }

      case 'AddressComponent': {
        return (
          <Grid
            container={true}
            spacing={0}
            direction={'column'}
          >
            <Grid item={true} xs={12}>
              <AltinnCheckBox
                checked={(this.state.component as IFormAddressComponent).simplified}
                onChangeFunction={this.handleToggleAddressSimple}
              />
              {this.props.language.ux_editor.modal_configure_address_component_simplified}
            </Grid>
            {
              renderSelectTextFromResources(
                'modal_properties_label_helper',
                this.handleTitleChange,
                this.props.textResources,
                this.props.language,
                this.props.component.textResourceBindings.title,
              )
            }

            {Object.keys(AddressKeys).map((value: AddressKeys, index) => {
              const simple: boolean = (this.state.component as IFormAddressComponent).simplified;
              if (simple && (value === AddressKeys.careOf || value === AddressKeys.houseNumber)) {
                return null;
              }
              return (
                renderSelectDataModelBinding(
                  this.props.component.dataModelBindings,
                  this.handleDataModelChange,
                  this.props.language,
                  getTextResourceByAddressKey(value, this.props.language),
                  value,
                  value,
                  index,
                )
              );
            })}
          </Grid >
        );
      }
      case 'ThirdParty': {
        const [packageName, component] = this.props.component.textResourceBindings.title.split(' - ');
        if (!this.props.thirdPartyComponents || !this.props.thirdPartyComponents[packageName] ||
          !this.props.thirdPartyComponents[packageName][component]) {
          return null;
        }
        return (
          <div>
            <span className='a-btn-icon-text'>{packageName} - {component}</span>
            {this.props.thirdPartyComponents[packageName][component]}
          </div>
        );
      }

      case 'FileUpload': {
        const component = (this.props.component as IFormFileUploaderComponent);
        return (
          <Grid>
            <Grid item={true} xs={12}>
              <AltinnRadioGroup
                row={true}
                value={component.displayMode}
                onChange={this.handleDisplayModeChange}
              >
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_file_upload_simple', this.props.language)}
                  value={'simple'}
                />
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_file_upload_list', this.props.language)}
                  value={'list'}
                />
              </AltinnRadioGroup>
            </Grid>
            <Grid item={true} xs={12}>
              {renderSelectTextFromResources('modal_properties_label_helper',
                this.handleTitleChange,
                this.props.textResources,
                this.props.language,
                this.props.component.textResourceBindings.title)}
              {renderSelectTextFromResources('modal_properties_description_helper',
                this.handleDescriptionChange,
                this.props.textResources,
                this.props.language,
                this.props.component.textResourceBindings.description)}
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnRadioGroup
                row={true}
                value={component.hasCustomFileEndings ? 'true' : 'false'}
                onChange={this.handleHasCustomFileEndingsChange}
              >
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_valid_file_endings_all', this.props.language)}
                  value={'false'}
                />
                <AltinnRadio
                  label={getLanguageFromKey(
                    'ux_editor.modal_properties_valid_file_endings_custom', this.props.language)}
                  value={'true'}
                />
              </AltinnRadioGroup>
            </Grid>

            {component.hasCustomFileEndings &&
              <Grid item={true} xs={12}>
                <AltinnInputField
                  id={'modal-properties-valid-file-endings'}
                  onChangeFunction={this.handleValidFileEndingsChange}
                  inputValue={component.validFileEndings}
                  inputDescription={getLanguageFromKey(
                    'ux_editor.modal_properties_valid_file_endings_helper', this.props.language)}
                  inputFieldStyling={{ width: '100%' }}
                  inputDescriptionStyling={{ marginTop: '24px' }}
                />
              </Grid>
            }
            <Grid item={true} xs={12}>
              <AltinnInputField
                id={'modal-properties-minimum-files'}
                onChangeFunction={this.handleNumberOfAttachmentsChange('min')}
                inputValue={component.minNumberOfAttachments || 0}
                inputDescription={getLanguageFromKey('ux_editor.modal_properties_minimum_files', this.props.language)}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type={'number'}
              />
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnInputField
                id={'modal-properties-maximum-files'}
                onChangeFunction={this.handleNumberOfAttachmentsChange('max')}
                inputValue={component.maxNumberOfAttachments || 1}
                inputDescription={getLanguageFromKey('ux_editor.modal_properties_maximum_files', this.props.language)}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type={'number'}
              />
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnInputField
                id={'modal-properties-file-size'}
                onChangeFunction={this.handleMaxFileSizeInMBChange}
                inputValue={component.maxFileSizeInMB || 0}
                inputDescription={getLanguageFromKey(
                  'ux_editor.modal_properties_maximum_file_size', this.props.language)}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type={'number'}
              />
              <Typography style={{ fontSize: '1.6rem', display: 'inline-block', marginTop: '23px', marginLeft: '6px' }}>
                {getLanguageFromKey(
                  'ux_editor.modal_properties_maximum_file_size_helper', this.props.language)}
              </Typography>
            </Grid>
          </Grid>
        );
      }
      case 'TextArea': {
        return (
          <Grid item={true} xs={12}>
            {renderSelectDataModelBinding(
              this.props.component.dataModelBindings,
              this.handleDataModelChange,
              this.props.language)}
            {renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.props.component.textResourceBindings.title)}
            {renderSelectTextFromResources('modal_properties_description_helper',
              this.handleDescriptionChange,
              this.props.textResources,
              this.props.language,
              this.props.component.textResourceBindings.description)}
          </Grid>
        );
      }

      default: {
        return null;
      }
    }
  }

  public getMinOccursFromDataModel = (dataBindingName: string): number => {
    const parentComponent = dataBindingName.replace('.value', '');
    const element: IDataModelFieldElement = this.props.dataModel.find((e: IDataModelFieldElement) => {
      const firstPeriod = e.ID.indexOf('.');
      const elementDataBindingName = e.ID.substr(firstPeriod + 1, e.ID.length - (firstPeriod + 1));
      return elementDataBindingName.toLowerCase() === parentComponent.toLowerCase();
    });
    return element.MinOccurs;
  }

  public handleValidFileEndingsChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent);
    component.validFileEndings = event.target.value;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleMaxFileSizeInMBChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent);
    component.maxFileSizeInMB = (event.target.value >= 0) ? event.target.value : 0;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent);
    if (type === 'max') {
      component.maxNumberOfAttachments = (event.target.value >= 1) ? event.target.value : 1;
    } else {
      component.minNumberOfAttachments = (event.target.value >= 0) ? event.target.value : 0;
      component.required = event.target.value > 0;
    }
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleDisplayModeChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent);
    component.displayMode = event.target.value;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleHasCustomFileEndingsChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent);
    component.hasCustomFileEndings = (event.target.value === 'true');
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleReadOnlyChange = (event: object, checked: boolean) => {
    const component = this.props.component;
    component.readOnly = checked;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    let { dataModelBindings: dataModelBinding } = (this.state.component as IFormAddressComponent);
    if (!dataModelBinding) {
      dataModelBinding = {};
    }
    dataModelBinding[key] = selectedDataModelElement;
    if (this.getMinOccursFromDataModel(selectedDataModelElement) === 0) {
      this.setState({
        component: {
          ...this.state.component,
          required: false,
          dataModelBindings: dataModelBinding,
        },
      }, () => this.props.handleComponentUpdate(this.state.component));
    } else {
      this.setState({
        component: {
          ...this.state.component,
          required: true,
          dataModelBindings: dataModelBinding,
        },
      }, () => this.props.handleComponentUpdate(this.state.component));
    }
  }

  public handleToggleAddressSimple = (event: object, checked: boolean) => {
    this.setState({
      component: {
        ...this.state.component,
        simplified: checked,
      },
    });
    this.props.handleComponentUpdate({
      ...this.props.component,
      simplified: checked,
    });
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
    thirdPartyComponents: state.thirdPartyComponents.components,
    dataModel: state.appData.dataModel.model,
    ...props,
  };
};

export const EditModalContent = withStyles(styles)(connect(mapStateToProps)(EditModalContentComponent));
