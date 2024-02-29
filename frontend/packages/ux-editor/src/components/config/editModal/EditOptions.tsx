import React, { useEffect, useRef, useState } from 'react';
import type { IOption } from '../../../types/global';
import {
  Fieldset,
  Heading,
  HelpText,
  Paragraph,
  Switch,
  Textfield,
  ErrorMessage,
} from '@digdir/design-system-react';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import { TextResource } from '../../TextResource';
import { useText, useComponentErrorMessage } from '../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../utils/component';

import { FormField } from '../../FormField';
import { StudioButton } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';

type SelectionComponentType = ComponentType.Checkboxes | ComponentType.RadioButtons;

export interface ISelectionEditComponentProvidedProps<T extends SelectionComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    onlyCodeListOptions?: boolean;
  };
}

export enum SelectedOptionsType {
  CodeList = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

const optionsTypeMap = {
  [SelectedOptionsType.CodeList]: {
    propertyName: 'optionsId',
    defaultValue: '',
  },
  [SelectedOptionsType.Manual]: {
    propertyName: 'options',
    defaultValue: [],
  },
};

const getSelectedOptionsType = (codeListId: string, options: IOption[]): SelectedOptionsType => {
  if (options?.length) {
    return SelectedOptionsType.Manual;
  }
  return SelectedOptionsType.CodeList;
};

export function EditOptions<T extends SelectionComponentType>({
  editFormId,
  component,
  handleComponentChange,
  renderOptions,
}: ISelectionEditComponentProvidedProps<T>) {
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

  const handleOptionsTypeChange = (oldOptionsType: SelectedOptionsType) => {
    const newOptionsType =
      oldOptionsType === SelectedOptionsType.CodeList
        ? SelectedOptionsType.Manual
        : SelectedOptionsType.CodeList;

    setSelectedOptionsType(newOptionsType);
    delete component[optionsTypeMap[oldOptionsType].propertyName];

    handleComponentChange({
      ...component,
      [optionsTypeMap[newOptionsType].propertyName]: optionsTypeMap[newOptionsType].defaultValue,
    });
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

  const handleAddOption = () => {
    handleComponentChange(addOptionToComponent(component, generateRandomOption()));
  };

  if (renderOptions?.onlyCodeListOptions) {
    return <EditCodeList component={component} handleComponentChange={handleComponentChange} />;
  }

  return (
    <>
      <div className={classes.codeListSwitchWrapper}>
        <Switch
          checked={selectedOptionsType === SelectedOptionsType.CodeList}
          onChange={() => handleOptionsTypeChange(selectedOptionsType)}
        >
          <Paragraph>{t('ux_editor.properties_panel.options.use_code_list_label')}</Paragraph>
        </Switch>
        <HelpText title='Bruk kodeliste'>
          {t('ux_editor.properties_panel.options.use_code_list_helptext')}
        </HelpText>
      </div>
      {selectedOptionsType === SelectedOptionsType.CodeList && (
        <EditCodeList component={component} handleComponentChange={handleComponentChange} />
      )}

      {selectedOptionsType === SelectedOptionsType.Manual && (
        <>
          <Heading level={4} size='xxsmall' spacing>
            {t('ux_editor.properties_panel.options.add_options')}
          </Heading>
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
                        <StudioButton
                          color='danger'
                          icon={<TrashIcon />}
                          onClick={removeItem}
                          variant='tertiary'
                          size='small'
                          title={t('ux_editor.properties_panel.options.remove_option')}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </>
      )}

      {selectedOptionsType === SelectedOptionsType.Manual && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StudioButton
            disabled={component.options?.some(({ label }) => !label)}
            fullWidth
            icon={<PlusIcon />}
            onClick={handleAddOption}
            variant='secondary'
            size='small'
          >
            {t('ux_editor.modal_new_option')}
          </StudioButton>
        </div>
      )}
      {errorMessage && <ErrorMessage size='small'>{errorMessage}</ErrorMessage>}
    </>
  );
}
