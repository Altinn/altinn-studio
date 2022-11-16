import React from 'react';
import { connect } from 'react-redux';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { renderSelectDataModelBinding, SelectTextFromRecources } from '../../utils/render';
import type {
  IAppState,
  IFormCheckboxComponent,
  IFormComponent,
  IFormRadioButtonComponent,
  ITextResource,
} from '../../types/global';
import { Button, ButtonColor, ButtonVariant, Checkbox, FieldSet, TextField } from '@altinn/altinn-design-system';
import classes from './SelectionEditComponent.module.css';

export interface ISelectionEditComponentProvidedProps {
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

export class SelectionEditComponent extends React.Component<
  ISelectionEditComponentProps,
  ISelectionEditComponentState
> {
  constructor(props: ISelectionEditComponentProps) {
    super(props);
    const component =
      this.props.component.type === 'Checkboxes'
        ? (this.props.component as IFormCheckboxComponent)
        : (this.props.component as IFormRadioButtonComponent);
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
  };

  public render() {
    const {
      component,
      handleAddOption,
      handleDataModelChange,
      handleDescriptionChange,
      handleOptionsIdChange,
      handlePreselectedOptionChange,
      handleReadOnlyChange,
      handleRemoveOption,
      handleRequiredChange,
      handleTitleChange,
      handleUpdateOptionLabel,
      handleUpdateOptionValue,
      language,
      textResources,
      type,
    } = this.props;
    const t = (key: string) => getLanguageFromKey(key, language);
    return (
      <>
        {renderSelectDataModelBinding(
          component.dataModelBindings,
          handleDataModelChange,
          language,
        )}
        <SelectTextFromRecources
          description={component.textResourceBindings.title}
          labelText={'modal_properties_label_helper'}
          language={language}
          onChangeFunction={handleTitleChange}
          placeholder={component.textResourceBindings.title}
          textResources={textResources}
        />
        <SelectTextFromRecources
          description={component.textResourceBindings.description}
          labelText={'modal_properties_description_helper'}
          language={language}
          onChangeFunction={handleDescriptionChange}
          placeholder={component.textResourceBindings.description}
          textResources={textResources}
        />
        <div>
          <Checkbox
            checked={component.readOnly}
            label={t('ux_editor.modal_configure_read_only')}
            onChange={(e) => handleReadOnlyChange(e, e.target.checked)}
          />
        </div>
        <div>
          <Checkbox
            checked={component.required}
            label={t('ux_editor.modal_configure_required')}
            onChange={(e) => handleRequiredChange(e, e.target.checked)}
          />
        </div>
        <AltinnRadioGroup
          onChange={this.handleRadioButtonChange}
          value={this.state.radioButtonSelection}
          row={true}
          description={
            type === 'RadioButtons'
              ? t('ux_editor.modal_properties_add_radio_button_options')
              : t('ux_editor.modal_properties_add_check_box_options')
          }
        >
          <AltinnRadio
            value='codelist'
            label={t('ux_editor.modal_add_options_codelist')}
          />
          <AltinnRadio
            value='manual'
            label={t('ux_editor.modal_add_options_manual')}
          />
        </AltinnRadioGroup>
        {this.state.radioButtonSelection === 'codelist' && (
          <div>
            <TextField
              id='modal-properties-code-list-id'
              label={t('ux_editor.modal_properties_code_list_id')}
              onChange={handleOptionsIdChange}
              value={(this.props.component as IFormRadioButtonComponent).optionsId}
            />
            <p>
              <a
                target='_blank'
                rel='noopener noreferrer'
                href='https://docs.altinn.studio/app/development/data/options/'
              >
                {t('ux_editor.modal_properties_code_list_read_more')}
              </a>
            </p>
          </div>
        )}
        {this.state.radioButtonSelection === 'manual' &&
          component.options?.map((option, index) => {
            const updateLabel = (e: any) => handleUpdateOptionLabel(index, e);
            const updateValue = (e: any) => handleUpdateOptionValue(index, e);
            const removeItem = () => handleRemoveOption(index);
            const key = `${option.label}-${index}`; // Figure out a way to remove index from key.
            const optionTitle = `${
              type === 'RadioButtons'
                ? t('ux_editor.modal_radio_button_increment')
                : t('ux_editor.modal_check_box_increment')
            } ${index + 1}`;
            return (
              <div className={classes.optionContainer} key={key}>
                <div className={classes.optionContentWrapper}>
                  <FieldSet legend={optionTitle}>
                    <div className={classes.optionContent}>
                      <SelectTextFromRecources
                        description={t('general.text')}
                        labelText={'modal_text'}
                        language={language}
                        onChangeFunction={updateLabel}
                        placeholder={option.label}
                        textResources={textResources}
                      />
                      <div>
                        <TextField
                          label={t('general.value')}
                          onChange={updateValue}
                          placeholder={t('general.value')}
                          value={option.value}
                        />
                      </div>
                    </div>
                  </FieldSet>
                </div>
                <div>
                  <Button
                    color={ButtonColor.Danger}
                    iconName={'Delete'}
                    onClick={removeItem}
                    variant={ButtonVariant.Quiet}
                  />
                </div>
              </div>
            );
          })}
        {this.state.radioButtonSelection === 'manual' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              disabled={component.options?.some(({ label }) => !label)}
              fullWidth
              iconName={'Add'}
              onClick={handleAddOption}
              variant={ButtonVariant.Outline}
            >
              {t('ux_editor.modal_new_option')}
            </Button>
          </div>
        )}
        <div>
          <TextField
            defaultValue={(component as IFormCheckboxComponent).preselectedOptionIndex}
            formatting={{ number: {} }}
            label={type === 'Checkboxes'
              ? t('ux_editor.modal_check_box_set_preselected')
              : t('ux_editor.modal_radio_button_set_preselected')}
            onChange={handlePreselectedOptionChange}
            placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
          />
        </div>
      </>
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

export const SelectionEdit = connect(mapStateToProps)(SelectionEditComponent);
