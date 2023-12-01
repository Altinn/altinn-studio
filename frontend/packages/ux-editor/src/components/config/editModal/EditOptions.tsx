import React, { useEffect, useRef, useState } from 'react';
import type { IOption } from '../../../types/global';
import { Button, Fieldset, Radio, Textfield } from '@digdir/design-system-react';
import classes from './EditOptions.module.css';
import { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { PlusIcon, XMarkIcon } from '@navikt/aksel-icons';
import { TextResource } from '../../TextResource';
import { useText, useComponentErrorMessage } from '../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../utils/component';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import { ErrorMessage } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
export interface ISelectionEditComponentProvidedProps
  extends IGenericEditComponent<FormCheckboxesComponent | FormRadioButtonsComponent> {
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
      <Radio.Group
        onChange={handleOptionsTypeChange}
        legend={t('ux_editor.modal_properties_add_radio_button_options')}
        name={`${component.id}-options`}
        value={selectedOptionsType}
        inline={true}
        size='small'
      >
        <Radio value={SelectedOptionsType.CodeList}>
          {t('ux_editor.modal_add_options_codelist')}
        </Radio>
        <Radio value={SelectedOptionsType.Manual}>{t('ux_editor.modal_add_options_manual')}</Radio>
      </Radio.Group>
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
                      <Fieldset legend={optionTitle}>
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
                            <Textfield
                              label={t('general.value')}
                              onChange={updateValue}
                              placeholder={t('general.value')}
                              value={option.value}
                            />
                          </div>
                        </div>
                      </Fieldset>
                    </div>
                    <div>
                      <Button
                        color='danger'
                        icon={<XMarkIcon />}
                        onClick={removeItem}
                        variant='tertiary'
                        size='small'
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
          <Button
            disabled={component.options?.some(({ label }) => !label)}
            fullWidth
            icon={<PlusIcon />}
            onClick={handleAddOption}
            variant='secondary'
            size='small'
          >
            {t('ux_editor.modal_new_option')}
          </Button>
        </div>
      )}
      {errorMessage && <ErrorMessage size='small'>{errorMessage}</ErrorMessage>}
    </>
  );
}
