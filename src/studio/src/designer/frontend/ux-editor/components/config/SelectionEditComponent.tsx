import { createStyles, Grid, IconButton, Input, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import { renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';

const styles = createStyles({
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
  text: {
    fontSize: '1.6rem',
  },
  textWithTopPadding: {
    fontSize: '1.6rem',
    paddingTop: '2.6rem',
  },
  textBold: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
  },
  input: {
    fontSize: '1.6rem',
    border: '0.1rem solid #BCC7CC',
    paddingLeft: '0.8rem',
  },
  inputFocused: {
    borderColor: '#2684FF',
    boxShadow: '0 0 0 0.1rem #2684FF',
    borderRadius: '0 !important',
    borderStyle: 'solid',
    borderWidth: '0.1rem',
  },
  gridContentWrapper: {
    border: '0.1rem solid #BCC7CC',
    padding: '1.2rem',
  },
  gridContainer: {
    marginBottom: '2.4rem',
  },
  gridItem: {
    marginBottom: '1.2rem',
  },
  gridItemWithTopMargin: {
    marginTop: '2.4rem',
  },
});

export interface ISelectionEditComponentProvidedProps {
  classes: any;
  component: IFormComponent;
  type: 'Checkboxes' | 'RadioButtons';
  handleOptionsIdChange: (e: any) => void;
  handleTitleChange: (updatedTitle: string) => void;
  handleDescriptionChange: (updatedDescription: string) => void;
  handleUpdateOptionLabel: (index: number, event: any) => void;
  handleUpdateOptionValue: (index: number, event: any) => void;
  handleRemoveOption: (index: number | string) => void;
  handleAddOption: () => void;
  handlePreselectedOptionChange: (event: any) => void;
  handleDataModelChange: (selectedDataModelElement: any) => void;
  handleRequiredChange: (event: any, checked: boolean) => void;
  handleReadOnlyChange: (event: any, checked: boolean) => void;
}

export interface ISelectionEditComponentProps extends ISelectionEditComponentProvidedProps {
  language: any;
  textResources: ITextResource[];
}

export interface ISelectionEditComponentState {
  radioButtonSelection: string;
}

export interface ICodeListOption {
  label: string;
  value: ICodeListListElement;
}

export class SelectionEditComponent
  extends React.Component<ISelectionEditComponentProps, ISelectionEditComponentState> {
  constructor(props: ISelectionEditComponentProps, state: ISelectionEditComponentState) {
    super(props, state);
    const component = this.props.component.type === 'Checkboxes'
      ? this.props.component as IFormCheckboxComponent
      : this.props.component as IFormRadioButtonComponent;
    let radioButtonSelection = '';
    if (component.optionsId) {
      radioButtonSelection = 'codelist';
    } else if (this.props.component.options.length > 0) {
      radioButtonSelection = 'manual';
    }
    this.state = {
      radioButtonSelection,
    };
  }

  public handleRadioButtonChange = (event: any, value: string) => {
    if (value === 'manual') {
      // reset codelist if it exists
      this.props.handleOptionsIdChange({ target: { value: undefined } });
    } else {
      // reset manual list if exists
      this.props.handleRemoveOption('all');
    }
    this.setState({
      radioButtonSelection: value,
    });
  }

  public render() {
    return (
      <div>
        <Grid item={true} xs={12}>
          {renderSelectDataModelBinding(
            this.props.component.dataModelBindings,
            this.props.handleDataModelChange,
            this.props.language,
          )}
          {renderSelectTextFromResources('modal_properties_label_helper',
            this.props.handleTitleChange,
            this.props.textResources,
            this.props.language,
            this.props.component.textResourceBindings.title,
            this.props.component.textResourceBindings.title)}
          {renderSelectTextFromResources('modal_properties_description_helper',
            this.props.handleDescriptionChange,
            this.props.textResources,
            this.props.language,
            this.props.component.textResourceBindings.description,
            this.props.component.textResourceBindings.description)}
          <Grid
            item={true} xs={12}
            style={{ marginTop: '18px' }}
          >
            <AltinnCheckBox
              checked={this.props.component.readOnly}
              onChangeFunction={this.props.handleReadOnlyChange}
            />
            {this.props.language.ux_editor.modal_configure_read_only}
          </Grid>
          <Grid
            item={true} xs={12}
          >
            <AltinnCheckBox
              checked={this.props.component.required}
              onChangeFunction={this.props.handleRequiredChange}
            />
            {this.props.language.ux_editor.modal_configure_required}
          </Grid>
          <AltinnRadioGroup
            onChange={this.handleRadioButtonChange}
            value={this.state.radioButtonSelection}
            row={true}
            description={(this.props.type === 'RadioButtons') ?
              this.props.language.ux_editor.modal_properties_add_radio_button_options :
              this.props.language.ux_editor.modal_properties_add_check_box_options}
          >
            <AltinnRadio
              value='codelist'
              label={this.props.language.ux_editor.modal_add_options_codelist}
            />
            <AltinnRadio
              value='manual'
              label={this.props.language.ux_editor.modal_add_options_manual}
            />
          </AltinnRadioGroup>
          <Grid item={true} classes={{ item: this.props.classes.gridItemWithTopMargin }}>
            {this.state.radioButtonSelection === 'codelist' &&
              <>
                <AltinnInputField
                  id='modal-properties-code-list-id'
                  onChangeFunction={this.props.handleOptionsIdChange}
                  inputValue={(this.props.component as IFormRadioButtonComponent).optionsId}
                  inputDescription={getLanguageFromKey(
                    'ux_editor.modal_properties_code_list_id', this.props.language,
                  )}
                  inputFieldStyling={{ width: '100%', marginBottom: '24px' }}
                  inputDescriptionStyling={{ marginTop: '24px' }}
                />
                <Typography>
                  <a
                    target='_blank'
                    rel='noopener noreferrer'
                    href='https://altinn.github.io/docs/altinn-studio/app-creation/options/'
                  >
                    {getLanguageFromKey(
                      'ux_editor.modal_properties_code_list_read_more', this.props.language,
                    )}
                  </a>
                </Typography>
              </>
            }
            {this.state.radioButtonSelection === 'manual' &&
              this.props.component.options?.map((option, index) => {
                const updateLabel = (e: any) => this.props.handleUpdateOptionLabel(index, e);
                const updateValue = (e: any) => this.props.handleUpdateOptionValue(index, e);
                const removeItem = () => this.props.handleRemoveOption(index);
                const key = `${option.label}-${index}`; // Figure out a way to remove index from key.
                return (
                  <Grid
                    container={true} xs={12}
                    key={key} classes={{ container: this.props.classes.gridContainer }}
                  >
                    <Grid
                      xs={11}
                      item={true}
                      classes={{ item: this.props.classes.gridContentWrapper }}
                    >
                      <Grid item={true} classes={{ item: this.props.classes.gridItem }} >
                        <Typography classes={{ root: this.props.classes.textBold }}>
                          {`${(this.props.type === 'RadioButtons') ?
                            this.props.language.ux_editor.modal_radio_button_increment :
                            this.props.language.ux_editor.modal_check_box_increment} ${index + 1}`}
                        </Typography>
                      </Grid>
                      <Grid item={true} classes={{ item: this.props.classes.gridItem }}>
                        {renderSelectTextFromResources('modal_text',
                          updateLabel,
                          this.props.textResources,
                          this.props.language,
                          option.label, // Check if the component works as intended
                          getLanguageFromKey('general.text', this.props.language))}
                      </Grid>
                      <Grid item={true}>
                        <Typography classes={{ root: this.props.classes.text }}>
                          {this.props.language.general.value}
                        </Typography>
                        <Input
                          classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
                          disableUnderline={true}
                          type='text'
                          fullWidth={true}
                          onChange={updateValue}
                          value={option.value}
                          placeholder={getLanguageFromKey('general.value', this.props.language)}
                        />
                      </Grid>
                    </Grid>
                    <Grid
                      xs={1} container={true}
                      direction='column'
                    >
                      <IconButton
                        type='button'
                        className={`${this.props.classes.formComponentsBtn} ${this.props.classes.specialBtn}`}
                        onClick={removeItem}
                      >
                        <i className='fa fa-circletrash' />
                      </IconButton>
                    </Grid>
                  </Grid>
                );
              })
            }
            {this.state.radioButtonSelection === 'manual' &&
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  disabled={this.props.component.options?.some(({ label }) => !label)}
                  type='button' className='a-btn'
                  onClick={this.props.handleAddOption}
                >
                  {this.props.language.ux_editor.modal_new_option}
                </button>
              </div>
            }
            <Grid item={true} classes={{ item: this.props.classes.gridItemWithTopMargin }}>
              <Typography classes={{ root: this.props.classes.text }}>
                {(this.props.type === 'Checkboxes') ?
                  this.props.language.ux_editor.modal_check_box_set_preselected :
                  this.props.language.ux_editor.modal_radio_button_set_preselected}
              </Typography>
              <Input
                classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
                disableUnderline={true}
                inputProps={{ min: 0 }}
                type='number'
                placeholder={this.props.language.ux_editor.modal_selection_set_preselected_placeholder}
                fullWidth={true}
                onChange={this.props.handlePreselectedOptionChange}
                defaultValue={(this.props.component as IFormCheckboxComponent).preselectedOptionIndex}
              />
            </Grid>
          </Grid>
        </Grid>
      </div >
    );
  }
}

const mapStateToProps = (
  state: IAppState,
  props: ISelectionEditComponentProvidedProps,
): ISelectionEditComponentProps => {
  return {
    language: state.appData.languageState.language,
    textResources: state.appData.textResources.resources,
    ...props,
  };
};

// @ts-ignore
export const SelectionEdit = withStyles(styles, { withTheme: true })(connect(mapStateToProps)(SelectionEditComponent));
