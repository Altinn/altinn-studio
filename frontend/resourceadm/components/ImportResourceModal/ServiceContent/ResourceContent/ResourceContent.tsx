import React, { ReactNode, useState } from 'react';
import classes from './ResourceContent.module.css';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useTranslation } from 'react-i18next';
import { ResourceNameAndId } from 'resourceadm/components/ResourceNameAndId';

export type ResourceContentProps = {
  altinn2LinkService: Altinn2LinkService;
};

export const ResourceContent = ({ altinn2LinkService }: ResourceContentProps): ReactNode => {
  const { t } = useTranslation();

  const [id, setId] = useState(altinn2LinkService.serviceName);
  const [title, setTitle] = useState(altinn2LinkService.serviceName);

  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);
  const [bothFieldsHaveSameValue, setBothFieldsHaveSameValue] = useState(true);

  /**
   * Replaces the spaces in the value typed with '-'.
   */
  const handleIDInput = (val: string) => {
    setId(val.replace(/\s/g, '-'));
  };

  /**
   * Updates the value of the title. If the edit field is not open,
   * then it updates the ID to the same as the title.
   *
   * @param val the title value typed
   */
  const handleEditTitle = (val: string) => {
    if (!editIdFieldOpen && bothFieldsHaveSameValue) {
      setId(val.replace(/\s/g, '-'));
    }
    setTitle(val);
  };

  /**
   * Handles the click of the edit button. If we click the edit button
   * so that it closes the edit field, the id is set to the title.
   *
   * @param isOpened the value of the button when it is pressed
   */
  const handleClickEditButton = (isOpened: boolean, isSave: boolean) => {
    setEditIdFieldOpen(isOpened);

    if (isSave) {
      setBothFieldsHaveSameValue(false);
    } else {
      if (!isOpened) {
        setBothFieldsHaveSameValue(true);
        // If we stop editing, set the ID to the title
        if (title !== id) setId(title.replace(/\s/g, '-'));
      }
    }
  };

  return (
    <div>
      <div className={classes.contentDivider} />
      <ResourceNameAndId
        isEditOpen={editIdFieldOpen}
        title={title}
        text={t('resourceadm.dashboard_import_modal_resource_name_and_id_text')}
        id={id}
        handleEditTitle={handleEditTitle}
        handleIdInput={handleIDInput}
        handleClickEditButton={(isSave: boolean) => handleClickEditButton(!editIdFieldOpen, isSave)}
        resourceIdExists={false} // TODO
        bothFieldsHaveSameValue={bothFieldsHaveSameValue}
      />
    </div>
  );
};
