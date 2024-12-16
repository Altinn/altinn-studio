import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDeleteButton, StudioErrorMessage } from '@studio/components';
import { AddManualOptionsModal } from './AddManualOptionsModal';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './/OptionListEditor';
import { useComponentErrorMessage } from '../../../../../../hooks';
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
  const initialComponentHasOptionList: boolean = !!component.optionsId || !!component.options;
  const [componentHasOptionList, setComponentHasOptionList] = useState<boolean>(
    initialComponentHasOptionList,
  );
  const errorMessage = useComponentErrorMessage(component);

  return (
    <>
      {componentHasOptionList ? (
        <SelectedOptionList
          setComponentHasOptionList={setComponentHasOptionList}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      ) : (
        <div className={classes.optionButtons}>
          <AddManualOptionsModal
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListSelector
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListUploader
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        </div>
      )}
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
}

type SelectedOptionListProps = {
  setComponentHasOptionList: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function SelectedOptionList({
  setComponentHasOptionList,
  component,
  handleComponentChange,
}: SelectedOptionListProps) {
  const { t } = useTranslation();

  const handleDelete = () => {
    if (component.options) {
      delete component.options;
    }

    const emptyOptionsId = '';
    handleComponentChange({
      ...component,
      optionsId: emptyOptionsId,
    });

    setComponentHasOptionList(false);
  };

  return (
    <div className={classes.chosenOptionContainer}>
      <OptionListEditor component={component} handleComponentChange={handleComponentChange} />
      <div className={classes.deleteButtonContainer}>
        <StudioDeleteButton
          className={classes.deleteButton}
          onDelete={handleDelete}
          title={t('ux_editor.options.option_remove_text')}
          variant={'tertiary'}
        />
      </div>
    </div>
  );
}
