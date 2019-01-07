import { createStyles, FormControlLabel, Grid, IconButton, Input, Radio, RadioGroup, Typography, withStyles, TextField } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';

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
    fontSize: '1.6rem',
  },
  radio: {
    color: ' #0095DD' + '!important',
  },
  text: {
    fontSize: '1.6rem',
  },
  textWithTopPadding: {
    fontSize: '1.6rem',
    paddingTop: '24px',
  },
  textBold: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
  },
  input: {
    fontSize: '1.6rem',
    border: '1px solid #BCC7CC',
    paddingLeft: '8px',
  },
  inputFocused: {
    borderColor: '#2684FF',
    boxShadow: '0 0 0 1px #2684FF',
    borderRadius: '0 !important',
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  gridContentWrapper: {
    border: '1px solid #BCC7CC',
    padding: '12px',
  },
  gridContainer: {
    paddingBottom: '24px',
  },
  gridItem: {
    paddingBottom: '12px',
  },
});

export interface ISelectionEditComponentProvidedProps {
  classes: any;
  component: IFormCheckboxComponent | IFormRadioButtonComponent;
  type: 'checkboxes' | 'radiobuttons';
  handleCodeListChanged: (selectedCodeList: IOptions) => void;
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
    };
  }

  public handleRadioButtonChange = (event: any, value: string) => {
    this.setState({
      radioButtonSelection: value,
    });
  }

  public render() {
    return (
      <div>
        <Grid item={true} xs={12}>
          {renderSelectDataModelBinding(
            this.props.component.dataModelBinding,
            this.props.handleDataModelChange,
            this.props.language,
          )}
          {renderSelectTextFromResources('modal_properties_label_helper',
            this.props.handleTitleChange,
            this.props.textResources,
            this.props.language,
            this.props.textResources,
            this.props.component.title)}
          {renderSelectTextFromResources('modal_properties_description_helper',
            this.props.handleDescriptionChange, this.props.textResources,
            this.props.language, this.props.textResources, this.props.component.description)}
          <Typography classes={{ root: this.props.classes.textWithTopPadding }}>
            {(this.props.type === 'radiobuttons') ?
              this.props.language.ux_editor.modal_properties_add_radio_button_options :
              this.props.language.ux_editor.modal_properties_add_check_box_options}
          </Typography>
          <RadioGroup
            onChange={this.handleRadioButtonChange}
            style={{ flexDirection: 'row' }}
            value={this.state.radioButtonSelection}
          >
            <FormControlLabel
              classes={{ label: this.props.classes.formControlLabel }}
              value={'codelist'}
              control={<Radio classes={{ root: this.props.classes.radio }} />}
              label={this.props.language.ux_editor.modal_add_options_codelist}
            />
            <FormControlLabel
              classes={{ label: this.props.classes.formControlLabel }}
              value={'manual'}
              control={<Radio classes={{ root: this.props.classes.radio }} />}
              label={this.props.language.ux_editor.modal_add_options_manual}
            />
          </RadioGroup>
          {this.state.radioButtonSelection === 'codelist' &&
            renderSelectTextFromResources('modal_properties_codelist_helper',
              this.props.handleCodeListChanged,
              this.props.codeListResources,
              this.props.language,
              this.props.textResources,
              this.props.component.codeListId, undefined, false, 'codelist')
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
                      <i className='ai ai-circletrash' />
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
          <Grid item={true}>
            <Typography classes={{ root: this.props.classes.text }}>
              {(this.props.type === 'checkboxes') ?
                this.props.language.ux_editor.modal_check_box_set_preselected :
                this.props.language.ux_editor.modal_radio_button_set_preselected}
            </Typography>
            <Input
              classes={{ root: this.props.classes.input, focused: this.props.classes.inputFocused }}
              disableUnderline={true}
              type={'number'}
              placeholder={(this.props.type === 'checkboxes') ?
                this.props.language.ux_editor.modal_check_box_preselected_placeholder :
                this.props.language.ux_editor.modal_radio_button_preselected_placeholder}
              fullWidth={true}
              onChange={this.props.handlePreselectedOptionChange}
              defaultValue={this.props.component.preselectedOptionIndex}
            />
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
