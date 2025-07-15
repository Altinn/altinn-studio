import { StudioButton, StudioLabel, StudioParagraph, StudioTextfield } from '@studio/components';
import { StudioCancelIcon, StudioEditIcon, StudioSaveIcon } from '@studio/icons';
import React, { type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './EditName.module.css';

export type EditNameProps = {
  label: string;
  name: string;
  onChange: (name: string) => void;
};

export function EditName({ name, label, onChange }: EditNameProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(name);

  if (!isEditing) {
    return (
      <StudioButton
        variant='tertiary'
        className={classes.reading}
        onClick={() => setIsEditing(true)}
        aria-label={label}
      >
        <div>
          <StudioLabel>{label}</StudioLabel>
          <StudioParagraph>{name}</StudioParagraph>
        </div>
        <StudioEditIcon />
      </StudioButton>
    );
  }

  const saveName = () => {
    onChange(inputValue);
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
    <div className={classes.editing}>
      <StudioTextfield
        autoFocus={true}
        className={classes.editingTextfield}
        label={label}
        value={inputValue}
        onChange={onChangeName}
        onKeyDown={onKeyDown}
      ></StudioTextfield>
      <StudioButton aria-label={t('general.save')} icon={<StudioSaveIcon />} onClick={saveName} />
      <StudioButton
        aria-label={t('general.cancel')}
        variant='tertiary'
        icon={<StudioCancelIcon />}
        onClick={cancelEditing}
      />
    </div>
  );
}
