import React from 'react';
import { StudioButton, StudioParagraph, StudioTextfield } from '@studio/components';
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
      <div className={classes.reading} onClick={() => setIsEditing(true)}>
        <StudioParagraph>{groupName}</StudioParagraph>
        <StudioEditIcon />
      </div>
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
        className={classes.editingTextfield}
        label={t('ux_editor.page_group.name')}
        value={groupName}
        onChange={onChangeName}
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
