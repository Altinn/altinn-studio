import { useEffect, useRef, useState } from 'react';
import type { IOption } from '../../../types/global';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import { TextResource } from '../../TextResource';
import { useText, useComponentErrorMessage } from '../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../utils/component';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import { FormField } from '../../FormField';
import {
  StudioButton,
  StudioFieldset,
  StudioRadio,
  StudioRadioGroup,
  StudioTextfield,
  StudioValidationMessage,
} from '@studio/components';

export interface ISelectionEditComponentProvidedProps extends IGenericEditComponent<
  FormCheckboxesComponent | FormRadioButtonsComponent
> {
  renderOptions?: {
    onlyCodeListOptions?: boolean;
  };
}

export enum SelectedOptionsType {
  CodeList = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

const getSelectedOptionsType = (codeListId: string, options: IOption[]): SelectedOptionsType => {
  if (options?.length) {
    return SelectedOptionsType.Manual;
  }
  return SelectedOptionsType.CodeList;
};

export function EditOptions({
  editFormId,
  component,
  handleComponentChange,
}: ISelectionEditComponentProvidedProps) {
  const previousEditFormId = useRef(editFormId);
  const initialSelectedOptionType = getSelectedOptionsType(component.optionsId, component.options);
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionType);
  const t = useText();

  const errorMessage = useComponentErrorMessage(component);

  useEffect(() => {
    if (editFormId !== previousEditFormId.current) {
      previousEditFormId.current = editFormId;
      setSelectedOptionsType(initialSelectedOptionType);
    }
  }, [editFormId, initialSelectedOptionType]);

  const handleOptionsTypeChange = (value: SelectedOptionsType) => {
    setSelectedOptionsType(value);
    if (value === SelectedOptionsType.CodeList) {
      delete component.options;
      handleComponentChange({
        ...component,
        optionsId: '',
      });
    }
    if (value === SelectedOptionsType.Manual) {
      delete component.optionsId;
      handleComponentChange({
        ...component,
        options: [],
      });
    }
  };

  const handleUpdateOptionLabel = (index: number) => (id: string) => {
    handleComponentChange({
      ...component,
      options: component.options.map((option, idx) =>
        idx === index ? { ...option, label: id } : option,
      ),
    });
  };

  const handleUpdateOptionValue = (index: number, e: any) => {
    handleComponentChange({
      ...component,
      options: component.options.map((option, idx) =>
        idx === index ? { ...option, value: e.target.value } : option,
      ),
    });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...component.options];
    options.splice(index, 1);
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleAddOption = () =>
    handleComponentChange(addOptionToComponent(component, generateRandomOption()));

  return (
    <>
      <StudioRadioGroup
        legend={t('ux_editor.modal_properties_add_radio_button_options')}
        data-size='sm'
      >
        <div className={classes.inlineRadios}>
          <StudioRadio
            name={`${component.id}-options`}
            value={SelectedOptionsType.CodeList}
            checked={selectedOptionsType === SelectedOptionsType.CodeList}
            onChange={(e) => handleOptionsTypeChange(e.target.value as SelectedOptionsType)}
            label={t('ux_editor.modal_add_options_code_list')}
          />
          <StudioRadio
            name={`${component.id}-options`}
            value={SelectedOptionsType.Manual}
            checked={selectedOptionsType === SelectedOptionsType.Manual}
            onChange={(e) => handleOptionsTypeChange(e.target.value as SelectedOptionsType)}
            label={t('ux_editor.modal_add_options_manual')}
          />
        </div>
      </StudioRadioGroup>

      {selectedOptionsType === SelectedOptionsType.CodeList && (
        <EditCodeList component={component} handleComponentChange={handleComponentChange} />
      )}

      {selectedOptionsType === SelectedOptionsType.Manual && (
        <FormField
          id={component.id}
          value={component.options}
          propertyPath={`${component.propertyPath}/properties/options`}
          renderField={() => (
            <div>
              {component.options?.map((option, index) => {
                const updateValue = (e: any) => handleUpdateOptionValue(index, e);
                const removeItem = () => handleRemoveOption(index);
                const key = `${option.label}-${index}`; // Figure out a way to remove index from key.
                const optionTitle = `${
                  component.type === 'RadioButtons'
                    ? t('ux_editor.modal_radio_button_increment')
                    : t('ux_editor.modal_check_box_increment')
                } ${index + 1}`;
                return (
                  <div className={classes.optionContainer} key={key}>
                    <div className={classes.optionContentWrapper}>
                      <StudioFieldset legend={optionTitle}>
                        <div className={classes.optionContent}>
                          <TextResource
                            handleIdChange={handleUpdateOptionLabel(index)}
                            placeholder={
                              component.type === 'RadioButtons'
                                ? t('ux_editor.modal_radio_button_add_label')
                                : t('ux_editor.modal_check_box_add_label')
                            }
                            textResourceId={option.label}
                          />
                          <div>
                            <StudioTextfield
                              label={t('general.value')}
                              onChange={updateValue}
                              placeholder={t('general.value')}
                              value={option.value}
                            />
                          </div>
                        </div>
                      </StudioFieldset>
                    </div>
                    <div>
                      <StudioButton
                        color='danger'
                        icon={<XMarkIcon />}
                        onClick={removeItem}
                        variant='tertiary'
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        />
      )}

      {selectedOptionsType === SelectedOptionsType.Manual && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StudioButton
            disabled={component.options?.some(({ label }) => !label)}
            fullWidth
            icon={<PlusIcon />}
            onClick={handleAddOption}
            variant='secondary'
          >
            {t('ux_editor.modal_new_option')}
          </StudioButton>
        </div>
      )}
      {errorMessage && (
        <StudioValidationMessage data-size='sm'>{errorMessage}</StudioValidationMessage>
      )}
    </>
  );
}
