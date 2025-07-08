import React, { type KeyboardEvent } from 'react';
import { StudioButton, StudioLabel, StudioParagraph, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { StudioCancelIcon, StudioEditIcon, StudioSaveIcon } from '@studio/icons';
import classes from './EditGroupName.module.css';

export type EditGroupNameProps = {
  group: GroupModel;
  onChange: (name: string) => void;
};

export const EditGroupName = ({ group, onChange }: EditGroupNameProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = React.useState(false);

  const [groupName, setGroupName] = React.useState(group.name);

  if (!isEditing) {
    const pageGroupNameTranslationKey = t('ux_editor.page_group.name');
    return (
      <StudioButton
        variant='tertiary'
        className={classes.reading}
        onClick={() => setIsEditing(true)}
        aria-label={pageGroupNameTranslationKey}
      >
        <div>
          <StudioLabel>{pageGroupNameTranslationKey}</StudioLabel>
          <StudioParagraph>{groupName || pageGroupNameTranslationKey}</StudioParagraph>
        </div>
        <StudioEditIcon />
      </StudioButton>
    );
  }

  const saveGroupName = () => {
    onChange(groupName);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setGroupName(group.name);
    setIsEditing(false);
  };

  const onChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGroupName(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') saveGroupName();
    if (event.key === 'Escape') cancelEditing();
  };

  return (
    <div className={classes.editing}>
      <StudioTextfield
        autoFocus={true}
        className={classes.editingTextfield}
        label={t('ux_editor.page_group.name')}
        value={groupName}
        onChange={onChangeName}
        onKeyDown={onKeyDown}
      ></StudioTextfield>
      <StudioButton
        aria-label={t('general.save')}
        icon={<StudioSaveIcon />}
        onClick={saveGroupName}
      />
      <StudioButton
        aria-label={t('general.cancel')}
        variant='tertiary'
        icon={<StudioCancelIcon />}
        onClick={cancelEditing}
      />
    </div>
  );
};
