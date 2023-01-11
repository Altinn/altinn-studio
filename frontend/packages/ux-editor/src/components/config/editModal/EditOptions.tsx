import React, { useEffect, useState } from 'react';
import type { IOptions, } from '../../../types/global';
import { TextField } from '@altinn/altinn-design-system';
import {
  Button,
  ButtonColor,
  ButtonVariant,
  FieldSet,
  RadioGroup,
  RadioGroupVariant
} from '@digdir/design-system-react';
import classes from './EditOptions.module.css';
import { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { Add, Delete } from '@navikt/ds-icons';
import { TextResource } from '../../TextResource';
import { useText } from '../../../hooks';

export interface ISelectionEditComponentProvidedProps extends IGenericEditComponent {
  renderOptions?: {
    onlyCodeListOptions?: boolean;
  }
}

export enum SelectedOptionsType {
  Codelist = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

const getSelectedOptionsType = (codeListId: string, options: IOptions[]): SelectedOptionsType => {
  if (codeListId) {
    return SelectedOptionsType.Codelist;
  }
  if (options?.length) {
    return SelectedOptionsType.Manual;
  }
  return SelectedOptionsType.Unknown;
}

export function EditOptions({
  component,
  handleComponentChange,
}: ISelectionEditComponentProvidedProps) {
  const [selectedOptionsType, setSelectedOptionsType] =
    useState(getSelectedOptionsType(component.optionsId, component.options));
  const t = useText();

  useEffect(() => {
    resetPrevOptionsType();
  }, [selectedOptionsType]);

  const handleOptionsTypeChange = (value) => {
    setSelectedOptionsType(value);
  };

  const resetPrevOptionsType = () => {
    if (selectedOptionsType === SelectedOptionsType.Unknown) {
      return;
    }

    if (selectedOptionsType === SelectedOptionsType.Codelist) {
      handleComponentChange({
        ...component,
        options: undefined,
      });
    } else {
      handleComponentChange({
        ...component,
        optionsId: null,
      });
    }
  };

  const handleUpdateOptionLabel = (index: number) => (id: string) => {
    const options = [...component.options];
    options[index].label = id;
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleUpdateOptionValue = (index: number, e: any) => {
    const options = [...component.options];
    options[index].value = e.target.value;
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...component.options];
    options.splice(index);
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleAddOption = () => {
    const options = [...component.options || []];
    options.push({ label: '', value: '' });
    handleComponentChange({
      ...component,
      options,
    });
  };

  return (
    <>
      <RadioGroup
        items={[
          {
            value: 'codelist',
            label: t('ux_editor.modal_add_options_codelist'),
          },
          {
            value: 'manual',
            label: t('ux_editor.modal_add_options_manual'),
          }
        ]}
        legend={component.type === 'RadioButtons'
          ? t('ux_editor.modal_properties_add_radio_button_options')
          : t('ux_editor.modal_properties_add_check_box_options')}
        name={`${component.id}-options`}
        onChange={handleOptionsTypeChange}
        value={selectedOptionsType}
        variant={RadioGroupVariant.Horizontal}
      />
      {selectedOptionsType === SelectedOptionsType.Codelist && (
        <EditCodeList
          component={component}
          handleComponentChange={handleComponentChange}
        />
      )}
      {selectedOptionsType === SelectedOptionsType.Manual &&
        component.options?.map((option, index) => {
          const updateValue = (e: any) => handleUpdateOptionValue(index, e);
          const removeItem = () => handleRemoveOption(index);
          const key = `${option.label}-${index}`; // Figure out a way to remove index from key.
          const optionTitle = `${
            component.type === 'RadioButtons'
              ? t('ux_editor.modal_radio_button_increment')
              : t('ux_editor.modal_check_box_increment')
          } ${index + 1}`;
          return (
            <div
              className={classes.optionContainer}
              key={key}
            >
              <div className={classes.optionContentWrapper}>
                <FieldSet legend={optionTitle}>
                  <div className={classes.optionContent}>
                    <TextResource
                      handleIdChange={handleUpdateOptionLabel(index)}
                      placeholder={component.type === 'RadioButtons'
                        ? t('ux_editor.modal_radio_button_add_label')
                        : t('ux_editor.modal_check_box_add_label')}
                      textResourceId={option.label}
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
                  icon={<Delete/>}
                  onClick={removeItem}
                  variant={ButtonVariant.Quiet}
                />
              </div>
            </div>
          );
        })}
      {selectedOptionsType === SelectedOptionsType.Manual && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            disabled={component.options?.some(({ label }) => !label)}
            fullWidth
            icon={<Add/>}
            onClick={handleAddOption}
            variant={ButtonVariant.Outline}
          >
            {t('ux_editor.modal_new_option')}
          </Button>
        </div>
      )}
    </>
  );
}
