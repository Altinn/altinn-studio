import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDeleteButton } from '@studio/components';
import { EditOptionList } from './EditOptionList';
import { EditManualOptionsWithEditor } from '../EditManualOptionsWithEditor';
import { OptionListEditor } from './EditOptionList/OptionListEditor';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import classes from './EditOptionChoice.module.css';

type EditOptionChoiceProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditOptionChoice({
  component,
  handleComponentChange,
}: EditOptionChoiceProps): React.ReactElement {
  const isOptionChosen =
    (component.optionsId !== undefined && component.optionsId !== '') ||
    component.options !== undefined;
  const [chosenOption, setChosenOption] = useState<boolean>(isOptionChosen);

  const shouldDisplayChosenOption = isOptionChosen && chosenOption === true;

  return (
    <>
      {shouldDisplayChosenOption ? (
        <DisplayChosenOption
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
          <EditOptionList
            setChosenOption={setChosenOption}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        </div>
      )}
    </>
  );
}

type DisplayChosenOptionProps = {
  setChosenOption: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function DisplayChosenOption({
  setChosenOption,
  component,
  handleComponentChange,
}: DisplayChosenOptionProps) {
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
