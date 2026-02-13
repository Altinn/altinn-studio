import { StudioFormActions, StudioTextfield, StudioProperty } from '@studio/components';
import React, { type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './EditName.module.css';
import cn from 'classnames';

export type EditNameProps = {
  label: string;
  name: string;
  className?: string;
  onChange?: (name: string) => void;
  validationFn?: (neme: string) => string | undefined;
};

export function EditName({ name, label, className, onChange, validationFn }: EditNameProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(name);
  const errorMessage = validationFn?.(inputValue);
  const disableSaveButton = !!errorMessage || inputValue === name;
  if (!isEditing) {
    return (
      <StudioProperty.Button
        onClick={() => setIsEditing(true)}
        property={label}
        title={label}
        value={name}
      />
    );
  }

  const saveName = () => {
    onChange?.(inputValue);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setInputValue(name);
    setIsEditing(false);
  };

  const onChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') saveName();
    if (event.key === 'Escape') cancelEditing();
  };

  return (
    <div className={cn(classes.editing, className)}>
      <div className={classes.editingTextfield}>
        <StudioTextfield
          autoFocus={true}
          label={label}
          value={inputValue}
          onChange={onChangeName}
          onKeyDown={onKeyDown}
          error={errorMessage}
        />
      </div>
      <StudioFormActions
        className={classes.editingActions}
        isLoading={false}
        iconOnly
        primary={{
          label: t('general.save'),
          onClick: saveName,
          disabled: disableSaveButton,
        }}
        secondary={{
          label: t('general.cancel'),
          onClick: cancelEditing,
        }}
      />
    </div>
  );
}
