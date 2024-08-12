import React, { useMemo } from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import classes from '../EditOptions.module.css';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useComponentErrorMessage } from '../../../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../../../utils/component';

import { StudioProperty } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditOption } from '../../EditOption';
import { ArrayUtils } from '@studio/pure-functions';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';

type SelectionComponentType = ComponentType.Checkboxes | ComponentType.RadioButtons;

export function EditManualOptions<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();

  const mappedOptionIds = useMemo(
    () => component.options?.map((_, index) => `option_${index}`),
    [component.options],
  );

  const errorMessage = useComponentErrorMessage(component);

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }
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
        <ErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </ErrorMessage>
      )}
    </>
  );
}
