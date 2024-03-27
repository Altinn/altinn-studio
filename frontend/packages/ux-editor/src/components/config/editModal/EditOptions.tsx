import React, { useEffect, useRef, useState } from 'react';
import type { IOption } from '../../../types/global';
import { Paragraph, Switch, ErrorMessage } from '@digdir/design-system-react';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { useComponentErrorMessage } from '../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../utils/component';

import { StudioProperty } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditOption } from './EditOption';
import { ArrayUtils } from '@studio/pure-functions';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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

  const handleOptionsChange = (options: Option[]) =>
    handleComponentChange({
      ...component,
      options,
    });

  const handleOptionChange = (index: number) => (newOption: Option) => {
    const newOptions = ArrayUtils.replaceByIndex(component.options, index, newOption);
    return handleOptionsChange(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const options = [...component.options];
    options.splice(index, 1);
    handleOptionsChange(options);
  };

  const handleAddOption = () => {
    handleComponentChange(addOptionToComponent(component, generateRandomOption()));
  };

  if (renderOptions?.onlyCodeListOptions) {
    return <EditCodeList component={component} handleComponentChange={handleComponentChange} />;
  }

  return (
    <div className={classes.root}>
      <div className={classes.codeListSwitchWrapper}>
        <Switch
          size='small'
          checked={selectedOptionsType === SelectedOptionsType.CodeList}
          onChange={() => handleOptionsTypeChange(selectedOptionsType)}
        >
          <Paragraph>{t('ux_editor.properties_panel.options.use_code_list_label')}</Paragraph>
        </Switch>
      </div>
      {selectedOptionsType === SelectedOptionsType.CodeList && (
        <EditCodeList component={component} handleComponentChange={handleComponentChange} />
      )}

      {selectedOptionsType === SelectedOptionsType.Manual && (
        <StudioProperty.Group>
          {component.options?.map((option, index) => {
            const removeItem = () => handleRemoveOption(index);
            const optionNumber = index + 1;
            const legend =
              component.type === 'RadioButtons'
                ? t('ux_editor.radios_option', { optionNumber })
                : t('ux_editor.checkboxes_option', { optionNumber });
            return (
              <EditOption
                key={option.id}
                legend={legend}
                onChange={handleOptionChange(index)}
                onDelete={removeItem}
                option={option}
              />
            );
          })}
          <StudioProperty.Button
            disabled={component.options?.some(({ label }) => !label)}
            onClick={handleAddOption}
            property={t('ux_editor.modal_new_option')}
          />
        </StudioProperty.Group>
      )}
      {selectedOptionsType !== SelectedOptionsType.CodeList && errorMessage && (
        <ErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </ErrorMessage>
      )}
    </div>
  );
}
