import React, { useMemo } from 'react';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { addOptionToComponent, generateRandomOption } from '../../../../../../utils/component';
import { StudioErrorMessage, StudioProperty } from '@studio/components-legacy';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { EditOption } from './EditOption';
import { ArrayUtils } from '@studio/pure-functions';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { useComponentErrorMessage } from '../../../../../../hooks';
import classes from './ManualTab.module.css';

export type ManualTabProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function ManualTab({ component, handleComponentChange }: ManualTabProps) {
  const { t } = useTranslation();
  const errorMessage = useComponentErrorMessage(component);

  const mappedOptionIds = useMemo(
    () => component.options?.map((_, index) => `option_${index}`),
    [component.options],
  );

  const handleOptionsChange = (options: Option[]) => {
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleOptionChange = (index: number) => (newOption: Option) => {
    const newOptions = ArrayUtils.replaceByIndex(component.options || [], index, newOption);
    return handleOptionsChange(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(component.options || [])];
    options.splice(index, 1);
    handleOptionsChange(options);
  };

  const handleAddOption = () => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange(addOptionToComponent(component, generateRandomOption()));
  };

  return (
    <>
      <StudioProperty.Group>
        {component.options?.map((option, index) => {
          const removeItem = () => handleRemoveOption(index);
          const key = mappedOptionIds[index];
          const optionNumber = index + 1;
          const legend =
            component.type === 'RadioButtons'
              ? t('ux_editor.radios_option', { optionNumber })
              : t('ux_editor.checkboxes_option', { optionNumber });
          return (
            <EditOption
              key={key}
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
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
}
