import React, { useEffect, useRef, useState } from 'react';
import type { IOption } from '../../../types/global';
import { Heading, HelpText, Paragraph, Switch } from '@digdir/design-system-react';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../componentConfig';
import { EditCodeList } from './EditCodeList';
import { PlusIcon } from '@navikt/aksel-icons';
import { useComponentErrorMessage } from '../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../utils/component';
import { ErrorMessage } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
import { StudioButton } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditOption } from './EditOption';
import { replaceByIndex } from 'app-shared/utils/arrayUtils';
import { Option } from 'app-shared/types/Option';
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
    const newOptions = replaceByIndex(component.options, index, newOption);
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
                  const removeItem = () => handleRemoveOption(index);
                  const key = `${option.value}-${index}`; // Figure out a way to remove index from key.
                  const optionNumber = index + 1;
                  const legend =
                    component.type === 'RadioButtons'
                      ? t('ux_editor.radios_option', { optionNumber })
                      : t('ux_editor.checkboxes_option', { optionNumber });
                  return (
                    <div className={classes.optionContainer} key={key}>
                      <EditOption
                        option={option}
                        onChange={handleOptionChange(index)}
                        legend={legend}
                        onDelete={removeItem}
                      />
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
