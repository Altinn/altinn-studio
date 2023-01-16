import React, { useState } from 'react';
import classes from './AddOption.module.css';
import { TextResource } from './TextResource';
import { ButtonColor, ButtonVariant, TextField } from '@altinn/altinn-design-system';
import { Button, FieldSet } from '@digdir/design-system-react';
import { IGenericEditComponent } from './config/componentConfig';
import {
  IFormGenericOptionsComponent,
  IOption
} from '../types/global';
import { Add } from '@navikt/ds-icons';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { useText } from '../hooks';
import { addOptionToComponent } from '../utils/component';

export interface AddOptionProps<T extends IFormGenericOptionsComponent> extends IGenericEditComponent {
  addButtonClass: string;
  component: T;
  duplicateErrorText: string;
  emptyErrorText: string;
}

const initialNewOption = () => ({ label: generateRandomId(12), value: generateRandomId(4) });

export const AddOption = <T extends IFormGenericOptionsComponent>({
  addButtonClass,
  component,
  duplicateErrorText,
  emptyErrorText,
  handleComponentChange,
}: AddOptionProps<T>) => {
  const t = useText();

  const [isAddMode, setIsAddMode] = useState(false);
  const [newOption, setNewOption] = useState(initialNewOption());

  const isNewValueUnique = !component.options?.some((option) => option.value === newOption.value);
  const isNewValueEmpty = newOption.value === '';
  const isNewValueValid = isNewValueUnique && !isNewValueEmpty;
  let errorMessage: string | undefined = undefined;

  if (isNewValueEmpty) {
    errorMessage = emptyErrorText;
  } else if (!isNewValueUnique) {
    errorMessage = duplicateErrorText;
  }

  const addOption = (option: IOption) => {
    handleComponentChange(addOptionToComponent(component, option));
    setIsAddMode(false);
    setNewOption(initialNewOption());
  };

  return isAddMode ? (
    <div className={classes.addSection}>
      <FieldSet
        contentClassName={classes.fieldSetContent}
        error={errorMessage}
        legend={t('ux_editor.add_option')}
      >
        <div className={classes.addSectionFields}>
          <TextResource
            label={t('ux_editor.add_option_label')}
            textResourceId={newOption.label}
            handleIdChange={(id) => setNewOption({ ...newOption, label: id })}
            placeholder={t('ux_editor.add_option_label_add')}
          />
          <div>
            <TextField
              isValid={isNewValueValid}
              label={t('ux_editor.add_option_value')}
              onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
              value={newOption.value}
            />
          </div>
        </div>
        <div className={classes.addButtons}>
          <Button
            disabled={!isNewValueValid}
            onClick={() => addOption(newOption)}
            title={t('general.add')}
          >
            {t('general.add')}
          </Button>
          <Button
            onClick={() => setIsAddMode(false)}
            title={t('general.cancel')}
          >
            {t('general.cancel')}
          </Button>
        </div>
      </FieldSet>
    </div>
  ) : (
    <Button
      className={classes.addButton}
      onClick={() => setIsAddMode(true)}
      color={ButtonColor.Success}
      title={t('ux_editor.add_option')}
      variant={ButtonVariant.Quiet}
    >
      <span className={addButtonClass}>
        <Add/>
      </span>
      {t('ux_editor.add_option')}
    </Button>
  );
};
