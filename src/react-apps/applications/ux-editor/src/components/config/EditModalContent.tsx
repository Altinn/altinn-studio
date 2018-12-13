import { createStyles, FormControlLabel, Grid, IconButton, List, ListItem, Radio, RadioGroup, Typography, withStyles, ListItemText, TextField } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getTextResource, truncate } from '../../utils/language';
import { SelectDataModelComponent } from './SelectDataModelComponent';

const styles = createStyles({
  inputHelper: {
    marginTop: '1em',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blueDarker,
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
  formControlLabel: {
    fontSize: '16px',
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
  codeListResources?: ICodeListListElement[];
  saveEdit?: (updatedComponent: FormComponentType) => void;
  cancelEdit?: () => void;
  handleComponentUpdate?: (updatedComponent: FormComponentType) => void;
  language: any;
  classes: any;
}

export interface IEditModalContentState {
  component: IFormComponent;
  radioButtonSelection: string;
}

class EditModalContentComponent extends React.Component<IEditModalContentProps, IEditModalContentState> {
  constructor(_props: IEditModalContentProps, _state: IEditModalContentState) {
    super(_props, _state);

    this.state = {
      component: _props.component,
      radioButtonSelection: '',
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
    updatedComponent.description = selectedText ? selectedText.value : null;
    this.props.handleComponentUpdate(updatedComponent);
  }

  public getTextKeyFromDataModel = (dataBindingName: string): string => {
    const element: IDataModelFieldElement = this.props.dataModel.find((elem) =>
      elem.DataBindingName === dataBindingName);
    return element.Texts.Label;
  }

  public handleRadioButtonChange = (event: any, value: string) => {
    this.setState({
      radioButtonSelection: value,
    });
  }

  public handleCodeListChange = (selectedCodeList: any): void => {
    console.log(selectedCodeList);
  }

  public renderSelectDataModelBinding(): JSX.Element {
    return (
      <div>
        {this.renderPropertyLabel(this.props.language.ux_editor.modal_properties_data_model_helper)}
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
    resource: string = 'text',
  ): JSX.Element => {
    const resources: any = [];
    if (resource === 'text') {
      this.props.textResources.map((resource, index) => {
        const option = truncate(resource.value, truncateLimit);
        resources.push({ value: resource.id, label: option.concat('\n(', resource.id, ')') });
      });
    } else if (resource === 'codelist') {
      this.props.codeListResources.map((codeListResource) => {
        const option = truncate(codeListResource.codeListName, truncateLimit);
        resources.push({ value: codeListResource.id, label: option.concat(' (', codeListResource.id.toString(), ')') });
      });
    }

    return (
      <div>
        {this.renderPropertyLabel(this.props.language.ux_editor[labelText])}
        {createNewTextAllowed ?
          <CreatableSelect
            styles={customInput}
            options={resources}
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
            options={resources}
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

  public renderPropertyLabel(textKey: string) {
    return (
      <Typography gutterBottom={false} className={this.props.classes.inputHelper}>
        {textKey}
      </Typography>
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
              this.handleTitleChange, this.state.component.title, null, false)}
            <Grid item={true} xs={12}>
              {this.renderPropertyLabel(this.props.language.ux_editor.modal_header_type_helper)}
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
          <Grid>
            {this.renderSelectTextFromResources('modal_properties_paragraph_helper',
              this.handleTitleChange, this.props.component.title, 80, false)}
            {this.renderPropertyLabel(this.props.language.ux_editor.modal_properties_paragraph_edit_helper)}
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
      case 'RadioButtons': {
        const component: IFormRadioButtonComponent = this.state.component as IFormRadioButtonComponent;
        return (
          <div>
            <Grid item={true} xs={12}>
              {this.renderSelectDataModelBinding()}
              {this.renderSelectTextFromResources('modal_properties_label_helper',
                this.handleTitleChange, this.props.component.title)}
              {this.renderSelectTextFromResources('modal_properties_description_helper',
                this.handleDescriptionChange, this.props.component.description)}
              <Typography style={{ paddingTop: '12px', fontSize: '16px' }}>Hvordan vil du legge til radioknapper?</Typography>
              <RadioGroup onChange={this.handleRadioButtonChange} style={{ flexDirection: 'row' }} value={this.state.radioButtonSelection}>
                <FormControlLabel classes={{ label: this.props.classes.formControlLabel }} value={'Kodeliste'} control={<Radio />} label={'Kodeliste'} />
                <FormControlLabel classes={{ label: this.props.classes.formControlLabel }} value={'Manuelt'} control={<Radio />} label={'Manuelt'} />
              </RadioGroup>
              {this.state.radioButtonSelection === 'Kodeliste' &&
                this.renderSelectTextFromResources('modal_properties_codelist_helper',
                  this.handleCodeListChange, null, 40, false, 'codelist')
              }
              {this.state.radioButtonSelection === 'Manuelt' &&
                component.options.map((option, index) => {
                  return (
                    <Grid container={true} xs={12} key={index} style={{ paddingBottom: '24px' }}>
                      <Grid xs={11} item={true}>
                        <List style={{ border: '1px solid #BCC7CC' }}>
                          <ListItem>
                            <ListItemText>{'Radioknapp ' + (index + 1)}</ListItemText>
                          </ListItem>
                          <ListItem>
                            <TextField
                              id={'option-label-input-' + index}
                              label={'Navn'}
                              variant={'outlined'}
                              fullWidth={true}
                              value={option.label}
                              onChange={this.handleUpdateOptionLabel.bind(this, index)}
                            />
                          </ListItem>
                          <ListItem>
                            <TextField
                              id={'option-value-input-' + index}
                              label={'Verdi'}
                              variant={'outlined'}
                              fullWidth={true}
                              value={option.value}
                              onChange={this.handleUpdateOptionValue.bind(this, index)}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid xs={true} container={true} direction={'column'}>
                        <IconButton
                          type='button'
                          className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                          onClick={this.handleRemoveOption.bind(this, index)}
                        >
                          <i className='ai ai-circletrash' />
                        </IconButton>
                      </Grid>
                    </Grid>
                  );
                })
              }
            </Grid>
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
          </div >
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
    codeListResources: state.appData.codeLists.codeLists,
    classes: props.classes,
    ...props,
  };
};

export const EditModalContent = withStyles(styles, { withTheme: true })
  (connect(mapStateToProps)(EditModalContentComponent));
