import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDeleteButton } from '@studio/components';
import { EditManualOptionsWithEditor } from './EditManualOptionsWithEditor';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './/OptionListEditor';
import type { IGenericEditComponent } from '../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import classes from './EditTab.module.css';

type EditOptionChoiceProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab({
  component,
  handleComponentChange,
}: EditOptionChoiceProps): React.ReactElement {
  const componentHasOptionList: boolean = !!component.optionsId || !!component.options;
  const [chosenOption, setChosenOption] = useState<boolean>(componentHasOptionList);

  return (
    <>
      {chosenOption ? (
        <SelectedOptionList
          setChosenOption={setChosenOption}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      ) : (
        <div className={classes.optionButtons}>
          <EditManualOptionsWithEditor
            setChosenOption={setChosenOption}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListSelector
            setChosenOption={setChosenOption}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListUploader
            setChosenOption={setChosenOption}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        </div>
      )}
    </>
  );
}

type SelectedOptionListProps = {
  setChosenOption: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function SelectedOptionList({
  setChosenOption,
  component,
  handleComponentChange,
}: SelectedOptionListProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    const emptyOptionsId = '';
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId: emptyOptionsId,
    });

    setChosenOption(false);
  };

  const label =
    component.optionsId !== '' && component.optionsId !== undefined
      ? component.optionsId
      : t('ux_editor.modal_properties_code_list_custom_list');

  return (
    <div aria-label={label} className={classes.chosenOptionContainer}>
      <OptionListEditor
        label={label}
        optionsId={component.optionsId}
        component={component}
        handleComponentChange={handleComponentChange}
      />
      <div className={classes.deleteButtonContainer}>
        <StudioDeleteButton
          className={classes.deleteButton}
          onDelete={handleClick}
          title={t('ux_editor.options.option_remove_text')}
          variant={'tertiary'}
        />
      </div>
    </div>
  );
}
