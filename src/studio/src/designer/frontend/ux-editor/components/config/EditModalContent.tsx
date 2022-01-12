/* eslint-disable react/no-array-index-key */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable import/no-cycle */
import { Grid, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import { getLanguageFromKey } from 'app-shared/utils/language';
import Select from 'react-select';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector } from '../../selectors/getLayoutData';
import { truncate } from '../../utils/language';
import { renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';
import { getTextResourceByAddressKey, AddressKeys } from '../../utils/component';
import { idExists, validComponentId } from '../../utils/formLayout';
import { ICodeListOption, SelectionEdit } from './SelectionEditComponent';
import { ImageComponent } from './ImageComponent';
import EditBoilerplate from './EditBoilerplate';
import HeaderSizeSelect from './HeaderSizeSelect';
import { ComponentTypes } from '../index';
import { FileUploadWithTagComponent } from './FileUploadWithTagComponent';

const styles = {
  gridItem: {
    marginTop: '18px',
  },
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: 'auto',
    color: '#000000',
  },
  addComponentText: {
    marginTop: '2.4rem',
    color: '#6A6A6A',
    alignContent: 'center',
  },
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
  components?: IFormDesignerComponents;
  containers?: IFormDesignerContainers;
}

export interface IEditModalContentState {
  component: IFormComponent;
  error: string;
  errorMessageRef: React.RefObject<HTMLDivElement>;
  tmpId: string;
}

export class EditModalContentComponent extends React.Component<IEditModalContentProps, IEditModalContentState> {
  constructor(_props: IEditModalContentProps, _state: IEditModalContentState) {
    super(_props, _state);
    this.state = {
      component: _props.component,
      error: null,
      errorMessageRef: React.createRef<HTMLDivElement>(),
      tmpId: _props.component?.id,
    };
  }

  public handleDisabledChange = (e: any): void => {
    this.setState((prevState: IEditModalContentState) => {
      return {
        component: {
          ...prevState.component,
          disabled: e.target.checked,
        },
      };
    });
  }

  public handleTitleChange = (e: any): void => {
    this.setState((prevState: IEditModalContentState) => {
      const updatedComponent = prevState.component;
      updatedComponent.textResourceBindings.title = e ? e.value : null;
      return {
        component: updatedComponent,
      };
    }, () => this.props.handleComponentUpdate(this.state.component));
  }

  public handleIdChange = (event: any) => {
    this.setState({
      tmpId: event.target.value,
    });
  }

  public handleAddOption = () => {
    this.setState((prevState: IEditModalContentState) => {
      const updatedComponent: IFormComponent = (prevState.component);
      if (!updatedComponent.options) {
        updatedComponent.options = [];
      }
      updatedComponent.options.push({
        label: '',
        value: '',
      });
      return {
        component: {
          ...prevState.component,
          options: updatedComponent.options,
        },
      };
    }, () => this.props.handleComponentUpdate(this.state.component));
  }

  public handleRemoveOption = (index: number | string) => {
    this.setState((prevState: IEditModalContentState) => {
      const updatedComponent: IFormComponent = prevState.component;
      if (index === 'all') {
        updatedComponent.options = undefined;
      } else {
        updatedComponent.options.splice(index as number, 1);
      }
      return {
        component: {
          ...prevState.component,
          options: updatedComponent.options,
        },
      };
    }, () => this.props.handleComponentUpdate(this.state.component));
  }

  public handleUpdateOptionLabel = (
    index: number,
    optionLabel: any,
  ) => {
    this.setState((prevState: IEditModalContentState) => {
      const updatedComponent: IFormComponent = prevState.component;
      updatedComponent.options[index].label = optionLabel?.value;
      return {
        component: {
          ...prevState.component,
          options: updatedComponent.options,
        },
      };
    }, () => this.props.handleComponentUpdate(this.state.component));
  }

  public handleUpdateOptionValue = (
    index: number,
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    event.persist();
    this.setState((prevState: IEditModalContentState) => {
      const updatedComponent: IFormComponent = prevState.component;
      updatedComponent.options[index].value = event.target?.value;
      return {
        component: {
          ...prevState.component,
          options: updatedComponent.options,
        },
      };
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
    updatedComponent.preselectedOptionIndex = Number(event.target.value);
    this.props.handleComponentUpdate(updatedComponent);
  }

  public getMinOccursFromDataModel = (dataBindingName: string): number => {
    const parentComponent = dataBindingName.replace('.value', '').replace(/\./, '/');
    const element: IDataModelFieldElement = this.props.dataModel.find((e: IDataModelFieldElement) => {
      return e.xPath === `/${parentComponent}`;
    });
    return element?.minOccurs;
  }

  public getXsdDataTypeFromDataModel = (dataBindingName: string): string => {
    const element: IDataModelFieldElement = this.props.dataModel.find((e: IDataModelFieldElement) => {
      return e.dataBindingName === dataBindingName;
    });

    return element?.xsdValueType;
  }

  public handleValidFileEndingsChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent);
    component.validFileEndings = event.target.value;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleOptionsIdChange = (event: any) => {
    const component =
      (this.props.component as (IFormDropdownComponent | IFormCheckboxComponent | IFormRadioButtonComponent));
    component.optionsId = event.target.value;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleMaxFileSizeInMBChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent);
    const value = parseInt(event.target.value, 10);
    component.maxFileSizeInMB = (value >= 0) ? value : 0;
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent);
    const value = parseInt(event.target.value, 10);
    if (type === 'max') {
      component.maxNumberOfAttachments = (value >= 1) ? value : 1;
    } else {
      component.minNumberOfAttachments = (value >= 0) ? value : 0;
      component.required = value > 0;
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

  public handleButtonTypeChange = (selected: any) => {
    const component = this.props.component;
    if (!component.textResourceBindings) {
      component.textResourceBindings = {};
    }
    if (selected.value === 'NavigationButtons') {
      component.type = 'NavigationButtons';
      component.textResourceBindings.title = undefined;
      (component as any).textResourceId = undefined;
      component.customType = undefined;
      (component as any).showBackButton = true;
      component.textResourceBindings.next = 'next';
      component.textResourceBindings.back = 'back';
    } else if (selected.value === 'Button') {
      component.type = 'Button';
      component.textResourceBindings.next = undefined;
      component.textResourceBindings.back = undefined;
      (component as any).showPrev = undefined;
      (component as any).showBackButton = undefined;
      component.textResourceBindings.title = getLanguageFromKey(
        'ux_editor.modal_properties_button_type_submit', this.props.language,
      );
    }
    this.setState({
      component,
    });
    this.props.handleComponentUpdate(component);
  }

  public handleHasCustomFileEndingsChange = (event: any) => {
    const component = (this.props.component as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent);
    component.hasCustomFileEndings = (event.target.value === 'true');
    if (!component.hasCustomFileEndings) {
      component.validFileEndings = undefined;
    }
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

  public handleRequiredChange = (event: any, checked: boolean) => {
    const component = this.props.component;
    component.required = checked;
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
    const modifiedProperties: any = {
      dataModelBindings: dataModelBinding,
      required: this.getMinOccursFromDataModel(selectedDataModelElement) !== 0,
    };
    if (this.props.component.type === 'Datepicker') {
      modifiedProperties.timeStamp = this.getXsdDataTypeFromDataModel(selectedDataModelElement) === 'DateTime';
    }

    this.setState((prevState: IEditModalContentState) => {
      return {
        component: {
          ...prevState.component,
          ...modifiedProperties,
        },
      };
    }, () => this.props.handleComponentUpdate(this.state.component));
  }

  public handleToggleAddressSimple = (event: object, checked: boolean) => {
    this.setState((prevState: IEditModalContentState) => {
      return {
        component: {
          ...prevState.component,
          simplified: checked,
        } as IFormAddressComponent,
      };
    });
    this.props.handleComponentUpdate({
      ...this.props.component,
      simplified: checked,
    });
  }

  public handleClosePopup = () => {
    this.setState({
      error: null,
    });
  }

  public handleNewId = () => {
    if (
      idExists(this.state.tmpId, this.props.components, this.props.containers) &&
      this.state.tmpId !== this.props.component?.id
    ) {
      this.setState(() => ({
        error: getLanguageFromKey('ux_editor.modal_properties_component_id_not_unique_error', this.props.language),
      }));
    } else if (!this.state.tmpId || !validComponentId.test(this.state.tmpId)) {
      this.setState(() => ({
        error: getLanguageFromKey('ux_editor.modal_properties_component_id_not_valid', this.props.language),
      }));
    } else {
      this.setState((prevState: IEditModalContentState) => {
        return {
          error: null,
          component: {
            ...prevState.component,
            id: prevState.tmpId,
          } as IFormAddressComponent,
        };
      }, () => {
        this.props.handleComponentUpdate(this.state.component);
      });
    }
  }

  public renderComponentSpecificContent(): JSX.Element {
    switch (this.props.component.type) {
      case ComponentTypes.Header: {
        return (
          <HeaderSizeSelect
            renderChangeId={this.renderChangeId}
            component={this.state.component}
            language={this.props.language}
            textResources={this.props.textResources}
            handleTitleChange={this.handleTitleChange}
            handleUpdateHeaderSize={this.handleUpdateHeaderSize}
          />
        );
      }
      case ComponentTypes.Datepicker:
      case ComponentTypes.TextArea:
      case ComponentTypes.Input: {
        return (
          <>
            {this.renderChangeId()}
            <EditBoilerplate
              component={this.props.component}
              textResources={this.props.textResources}
              handleDataModelChange={this.handleDataModelChange}
              handleTitleChange={this.handleTitleChange}
              handleDescriptionChange={this.handleDescriptionChange}
              language={this.props.language}
            />
            <Grid
              item={true} xs={12}
              style={styles.gridItem}
            >
              <AltinnCheckBox
                checked={this.state.component.readOnly}
                onChangeFunction={this.handleReadOnlyChange}
              />
              {this.props.language.ux_editor.modal_configure_read_only}
            </Grid>
            <Grid
              item={true} xs={12}
            >
              <AltinnCheckBox
                checked={this.state.component.required}
                onChangeFunction={this.handleRequiredChange}
              />
              {this.props.language.ux_editor.modal_configure_required}
            </Grid>
          </>
        );
      }
      case ComponentTypes.AttachmentList: {
        return (
          <Grid>
            {this.renderChangeId()}
            {renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.state.component.textResourceBindings?.title,
              this.props.component.textResourceBindings?.title)}
          </Grid>
        );
      }
      case ComponentTypes.Paragraph: {
        return (
          <Grid>
            {this.renderChangeId()}
            {renderSelectTextFromResources('modal_properties_paragraph_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.state.component.textResourceBindings?.title,
              this.props.component.textResourceBindings?.title)}
          </Grid>
        );
      }
      case ComponentTypes.Checkboxes:
      case ComponentTypes.RadioButtons: {
        return (
          <>
            {this.renderChangeId()}
            <SelectionEdit
              type={this.props.component.type}
              component={this.state.component}
              key={this.state.component.id}
              handleAddOption={this.handleAddOption}
              handleOptionsIdChange={this.handleOptionsIdChange}
              handleDescriptionChange={this.handleDescriptionChange}
              handlePreselectedOptionChange={this.handlePreselectedOptionChange}
              handleRemoveOption={this.handleRemoveOption}
              handleTitleChange={this.handleTitleChange}
              handleUpdateOptionLabel={this.handleUpdateOptionLabel}
              handleUpdateOptionValue={this.handleUpdateOptionValue}
              handleDataModelChange={this.handleDataModelChange}
              handleRequiredChange={this.handleRequiredChange}
              handleReadOnlyChange={this.handleReadOnlyChange}
            />
          </>
        );
      }
      case ComponentTypes.Dropdown: {
        const component: IFormDropdownComponent = this.state.component as IFormDropdownComponent;
        return (
          <Grid container={true}>
            {this.renderChangeId()}
            <EditBoilerplate
              component={this.props.component}
              textResources={this.props.textResources}
              handleDataModelChange={this.handleDataModelChange}
              handleTitleChange={this.handleTitleChange}
              handleDescriptionChange={this.handleDescriptionChange}
              language={this.props.language}
            />
            <Grid
              item={true} xs={12}
              style={styles.gridItem}
            >
              <AltinnCheckBox
                checked={this.state.component.readOnly}
                onChangeFunction={this.handleReadOnlyChange}
              />
              {this.props.language.ux_editor.modal_configure_read_only}
            </Grid>
            <Grid
              item={true} xs={12}
            >
              <AltinnCheckBox
                checked={this.state.component.required}
                onChangeFunction={this.handleRequiredChange}
              />
              {this.props.language.ux_editor.modal_configure_required}
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnInputField
                id='modal-properties-code-list-id'
                onChangeFunction={this.handleOptionsIdChange}
                inputValue={component.optionsId}
                inputDescription={getLanguageFromKey(
                  'ux_editor.modal_properties_code_list_id', this.props.language,
                )}
                inputFieldStyling={{ width: '100%', marginBottom: '24px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
              />
            </Grid>
            <Typography>
              <a
                target='_blank'
                rel='noopener noreferrer'
                href='https://docs.altinn.studio/app/development/data/options/'
              >
                {getLanguageFromKey(
                  'ux_editor.modal_properties_code_list_read_more', this.props.language,
                )}
              </a>
            </Typography>
          </Grid>
        );
      }
      case ComponentTypes.NavigationButtons:
      case ComponentTypes.Button: {
        const types = [
          {
            value: 'Button',
            label: getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language),
          },
          {
            value: 'NavigationButtons',
            label: getLanguageFromKey('ux_editor.modal_properties_button_type_navigation', this.props.language),
          },
        ];
        return (
          <>
            {this.renderChangeId()}
            <Grid item={true} xs={12}>
              <Typography style={styles.inputHelper}>
                {getLanguageFromKey('ux_editor.modal_properties_button_type_helper', this.props.language)}
              </Typography>
              <Select
                options={types}
                value={types.find((element) => element.value === this.state.component.type)}
                onChange={this.handleButtonTypeChange}
                selectedElement={this.state.component.type}
                placeholder={getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language)}
              />
              {this.state.component.type === 'Button' && renderSelectTextFromResources('modal_properties_button_helper',
                this.handleTitleChange,
                this.props.textResources,
                this.props.language,
                this.state.component.textResourceBindings?.title,
                getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language))}
            </Grid>
          </>
        );
      }

      case ComponentTypes.AddressComponent: {
        return (
          <Grid
            container={true}
            spacing={0}
            direction='column'
          >
            {this.renderChangeId()}
            <Grid
              item={true}
              xs={12} style={{ marginTop: '2.4rem' }}
            >
              <AltinnCheckBox
                checked={(this.state.component as IFormAddressComponent).simplified}
                onChangeFunction={this.handleToggleAddressSimple}
              />
              {this.props.language.ux_editor.modal_configure_address_component_simplified}
            </Grid>
            {renderSelectTextFromResources('modal_properties_label_helper',
              this.handleTitleChange,
              this.props.textResources,
              this.props.language,
              this.state.component.textResourceBindings?.title,
              this.props.component.textResourceBindings?.title)}
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

      case ComponentTypes.FileUpload: {
        const component = (this.props.component as IFormFileUploaderComponent);
        return (
          <Grid>
            {this.renderChangeId()}
            <Grid item={true} xs={12}>
              <AltinnRadioGroup
                row={true}
                value={component.displayMode}
                onChange={this.handleDisplayModeChange}
              >
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_file_upload_simple', this.props.language)}
                  value='simple'
                />
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_file_upload_list', this.props.language)}
                  value='list'
                />
              </AltinnRadioGroup>
            </Grid>
            <Grid item={true} xs={12}>
              {renderSelectTextFromResources('modal_properties_label_helper',
                this.handleTitleChange,
                this.props.textResources,
                this.props.language,
                this.state.component.textResourceBindings?.title,
                this.props.component.textResourceBindings?.title)}
              {renderSelectTextFromResources('modal_properties_description_helper',
                this.handleDescriptionChange,
                this.props.textResources,
                this.props.language,
                this.state.component.textResourceBindings?.description,
                this.props.component.textResourceBindings?.description)}
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnRadioGroup
                row={true}
                value={component.hasCustomFileEndings ? 'true' : 'false'}
                onChange={this.handleHasCustomFileEndingsChange}
              >
                <AltinnRadio
                  label={getLanguageFromKey('ux_editor.modal_properties_valid_file_endings_all', this.props.language)}
                  value='false'
                />
                <AltinnRadio
                  label={getLanguageFromKey(
                    'ux_editor.modal_properties_valid_file_endings_custom', this.props.language,
                  )}
                  value='true'
                />
              </AltinnRadioGroup>
            </Grid>

            {component.hasCustomFileEndings &&
              <Grid item={true} xs={12}>
                <AltinnInputField
                  id='modal-properties-valid-file-endings'
                  onChangeFunction={this.handleValidFileEndingsChange}
                  inputValue={component.validFileEndings}
                  inputDescription={getLanguageFromKey(
                    'ux_editor.modal_properties_valid_file_endings_helper', this.props.language,
                  )}
                  inputFieldStyling={{ width: '100%' }}
                  inputDescriptionStyling={{ marginTop: '24px' }}
                />
              </Grid>
            }
            <Grid item={true} xs={12}>
              <AltinnInputField
                id='modal-properties-minimum-files'
                onChangeFunction={this.handleNumberOfAttachmentsChange('min')}
                inputValue={component.minNumberOfAttachments || 0}
                inputDescription={getLanguageFromKey('ux_editor.modal_properties_minimum_files', this.props.language)}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type='number'
              />
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnInputField
                id='modal-properties-maximum-files'
                onChangeFunction={this.handleNumberOfAttachmentsChange('max')}
                inputValue={component.maxNumberOfAttachments || 1}
                inputDescription={getLanguageFromKey('ux_editor.modal_properties_maximum_files', this.props.language)}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type='number'
              />
            </Grid>
            <Grid item={true} xs={12}>
              <AltinnInputField
                id='modal-properties-file-size'
                onChangeFunction={this.handleMaxFileSizeInMBChange}
                inputValue={component.maxFileSizeInMB || 0}
                inputDescription={getLanguageFromKey(
                  'ux_editor.modal_properties_maximum_file_size', this.props.language,
                )}
                inputFieldStyling={{ width: '60px' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
                type='number'
              />
              <Typography
                style={{
                  fontSize: '1.6rem',
                  display: 'inline-block',
                  marginTop: '23px',
                  marginLeft: '6px',
                }}
              >
                {getLanguageFromKey(
                  'ux_editor.modal_properties_maximum_file_size_helper', this.props.language,
                )}
              </Typography>
            </Grid>
          </Grid>
        );
      }

      case ComponentTypes.FileUploadWithTag: {
        return (
          <Grid>
            {this.renderChangeId()}
            <FileUploadWithTagComponent
              component={this.props.component as IFormFileUploaderWithTagComponent}
              stateComponent={this.state.component}
              language={this.props.language}
              textResources={this.props.textResources}
              handleComponentUpdate={this.props.handleComponentUpdate}
              handleTitleChange={this.handleTitleChange}
              handleDescriptionChange={this.handleDescriptionChange}
              handleOptionsIdChange={this.handleOptionsIdChange}
              handleNumberOfAttachmentsChange={this.handleNumberOfAttachmentsChange}
              handleMaxFileSizeInMBChange={this.handleMaxFileSizeInMBChange}
              handleHasCustomFileEndingsChange={this.handleHasCustomFileEndingsChange}
              handleValidFileEndingsChange={this.handleValidFileEndingsChange}
              />
          </Grid>
        );
      }

      case ComponentTypes.Image: {
        return (
          <Grid>
            {this.renderChangeId()}
            <ImageComponent
              component={this.props.component as IFormImageComponent}
              handleComponentUpdate={this.props.handleComponentUpdate}
              language={this.props.language}
              textResources={this.props.textResources}
            />
          </Grid>
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
          <option
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            value={resource.id}
            title={resource.value}
          >
            {option}
          </option>
        );
      }));
  }

  public renderChangeId = (): JSX.Element => {
    return (
      <Grid item={true} xs={12}>
        <AltinnInputField
          id='component-id'
          onChangeFunction={this.handleIdChange}
          onBlurFunction={this.handleNewId}
          inputValue={this.state.tmpId}
          inputDescription={getLanguageFromKey(
            'ux_editor.modal_properties_component_change_id', this.props.language,
          )}
          inputFieldStyling={{ width: '100%' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
        />
        <div ref={this.state.errorMessageRef} />
        <ErrorPopover
          anchorEl={this.state.error ? this.state.errorMessageRef.current : null}
          onClose={this.handleClosePopup}
          errorMessage={this.state.error}
        />
      </Grid>
    );
  };

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
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  return {
    language: state.appData.languageState.language,
    textResources: state.appData.textResources.resources,
    dataModel: state.appData.dataModel.model,
    components: GetLayoutComponentsSelector(state),
    containers: GetLayoutContainersSelector(state),
    ...props,
  };
};
// @ts-ignore
export const EditModalContent = withStyles(styles)(connect(mapStateToProps)(EditModalContentComponent));
