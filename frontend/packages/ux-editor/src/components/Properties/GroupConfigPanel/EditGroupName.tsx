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
    return (
      <StudioButton
        variant='tertiary'
        className={classes.reading}
        onClick={() => setIsEditing(true)}
        aria-label={t('ux_editor.page_group.name')}
      >
        <div>
          <StudioLabel>{t('ux_editor.page_group.name')}</StudioLabel>
          <StudioParagraph>{groupName || t('ux_editor.page_group.name')}</StudioParagraph>
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

  return (
    <div className={classes.editing}>
      <StudioTextfield
        autoFocus={true}
        className={classes.editingTextfield}
        label={t('ux_editor.page_group.name')}
        value={groupName}
        onChange={onChangeName}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === 'Enter') saveGroupName();
          if (event.key === 'Escape') cancelEditing();
        }}
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
