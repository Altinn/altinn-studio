import { createStyles, Grid, IconButton, Input, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getCodeListIndexByName } from '../../utils/apiConnection';
import { noOptionsMessage, renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';
import { customInput } from './EditModalContent';

const styles = createStyles({
  formComponentsBtn: {
    'fontSize': '0.85em',
    'fill': altinnTheme.altinnPalette.primary.blueDarker,
    'paddingLeft': '0',
    'marginTop': '0.1em',
    'outline': 'none !important',
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
  component: IFormCheckboxComponent | IFormRadioButtonComponent;
  type: 'checkboxes' | 'radiobuttons';
  handleCodeListChanged: (e: any) => void;
  handleTitleChange: (updatedTitle: string) => void;
  handleDescriptionChange: (updatedDescription: string) => void;
  handleUpdateOptionLabel: (index: number, event: any) => void;
  handleUpdateOptionValue: (index: number, event: any) => void;
  handleRemoveOption: (index: number, event: any) => void;
  handleAddOption: () => void;
  handlePreselectedOptionChange: (event: any) => void;
  handleDataModelChange: (selectedDataModelElement: any) => void;
}

export interface ISelectionEditComponentProps extends ISelectionEditComponentProvidedProps {
  language: any;
  textResources: ITextResource[];
  codeListResources: ICodeListListElement[];
}

export interface ISelectionEditComponentState {
  radioButtonSelection: string;
  codeListOptions: ICodeListOption[];
}

export interface ICodeListOption {
  label: string;
  value: ICodeListListElement;
}

export class SelectionEditComponent
  extends React.Component<ISelectionEditComponentProps, ISelectionEditComponentState> {

  constructor(props: ISelectionEditComponentProps, state: ISelectionEditComponentState) {
    super(props, state);
    let radioButtonSelection = '';
    if (props.component.codeListId) {
      radioButtonSelection = 'codelist';
    } else if (this.props.component.options.length > 0) {
      radioButtonSelection = 'manual';
    }
    this.state = {
      radioButtonSelection,
      codeListOptions: this.getCodeListOptionArray(),
    };
  }

  public getCodeListOptionArray(): ICodeListOption[] {
    const options: any[] = [];
    if (this.props.codeListResources) {
      this.props.codeListResources.forEach((codeList) => {
        options.push({ label: codeList.codeListName, value: codeList });
      });
    }
    return options;
  }

  public handleRadioButtonChange = (event: any, value: string) => {
    this.setState({
      radioButtonSelection: value,
    });
  }

  public getCodeListLabel(codeList: ICodeListListElement): string {
    return codeList.codeListName + ' (' + codeList.id + ')';
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
            this.props.component.textResourceBindings.title)}
          {renderSelectTextFromResources('modal_properties_description_helper',
            this.props.handleDescriptionChange,
            this.props.textResources,
            this.props.language,
            this.props.component.textResourceBindings.description)}
          <AltinnRadioGroup
            onChange={this.handleRadioButtonChange}
            value={this.state.radioButtonSelection}
            row={true}
            description={(this.props.type === 'radiobuttons') ?
              this.props.language.ux_editor.modal_properties_add_radio_button_options :
              this.props.language.ux_editor.modal_properties_add_check_box_options}
          >
            <AltinnRadio
              value={'codelist'}
              label={this.props.language.ux_editor.modal_add_options_codelist}
            />
            <AltinnRadio
              value={'manual'}
              label={this.props.language.ux_editor.modal_add_options_manual}
            />
          </AltinnRadioGroup>
          <Grid item={true} classes={{ item: this.props.classes.gridItemWithTopMargin }}>
            {this.state.radioButtonSelection === 'codelist' &&
              <Typography classes={{ root: this.props.classes.text }}>
                {this.props.language.ux_editor.modal_properties_codelist_helper}
              </Typography>}
            {this.state.radioButtonSelection === 'codelist' &&
              <Select
                styles={customInput}
                options={this.state.codeListOptions}
                defaultValue={this.state.codeListOptions[
                  getCodeListIndexByName(this.props.component.codeListId, this.props.codeListResources)
                ]}
                isClearable={true}
                isSearchable={true}
                onChange={this.props.handleCodeListChanged}
                noOptionsMessage={noOptionsMessage.bind(this, this.props.language)}
                placeholder={this.props.language.general.choose}
              />
            }
            {this.state.radioButtonSelection === 'manual' &&
              this.props.component.options.map((option, index) => {
                return (
                  <Grid container={true} xs={12} key={index} classes={{ container: this.props.classes.gridContainer }}>
                    <Grid
                      xs={11}
                      item={true}
                      classes={{ item: this.props.classes.gridContentWrapper }}
                    >
                      <Grid item={true} classes={{ item: this.props.classes.gridItem }} >
                        <Typography classes={{ root: this.props.classes.textBold }}>
                          {((this.props.type === 'radiobuttons') ?
                            this.props.language.ux_editor.modal_radio_button_increment :
                            this.props.language.ux_editor.modal_check_box_increment) + ' ' + (index + 1)}
                        </Typography>
                      </Grid>
                      <Grid item={true} classes={{ item: this.props.classes.gridItem }}>
                        <Typography classes={{ root: this.props.classes.text }}>
                          {this.props.language.general.label}
                        </Typography>
                        <Input
                          classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
                          disableUnderline={true}
                          type={'text'}
                          fullWidth={true}
                          onChange={this.props.handleUpdateOptionLabel.bind(this, index)}
                          value={option.label}
                        />
                      </Grid>
                      <Grid item={true}>
                        <Typography classes={{ root: this.props.classes.text }}>
                          {this.props.language.general.value}
                        </Typography>
                        <Input
                          classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
                          disableUnderline={true}
                          type={'text'}
                          fullWidth={true}
                          onChange={this.props.handleUpdateOptionValue.bind(this, index)}
                          value={option.value}
                        />
                      </Grid>
                    </Grid>
                    <Grid xs={1} container={true} direction={'column'}>
                      <IconButton
                        type='button'
                        className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
                        onClick={this.props.handleRemoveOption.bind(this, index)}
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
                <button type='button' className='a-btn' onClick={this.props.handleAddOption}>
                  {this.props.language.ux_editor.modal_new_option}
                </button>
              </div>
            }
            <Grid item={true} classes={{ item: this.props.classes.gridItemWithTopMargin }}>
              <Typography classes={{ root: this.props.classes.text }}>
                {(this.props.type === 'checkboxes') ?
                  this.props.language.ux_editor.modal_check_box_set_preselected :
                  this.props.language.ux_editor.modal_radio_button_set_preselected}
              </Typography>
              <Input
                classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
                disableUnderline={true}
                inputProps={{ min: 0 }}
                type={'number'}
                placeholder={this.props.language.ux_editor.modal_selection_set_preselected_placeholder}
                fullWidth={true}
                onChange={this.props.handlePreselectedOptionChange}
                defaultValue={this.props.component.preselectedOptionIndex}
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
    language: state.appData.language.language,
    textResources: state.appData.textResources.resources,
    codeListResources: state.appData.codeLists.codeLists,
    ...props,
  };
};

export const SelectionEdit = withStyles(styles, { withTheme: true })
  (connect(mapStateToProps)(SelectionEditComponent));
