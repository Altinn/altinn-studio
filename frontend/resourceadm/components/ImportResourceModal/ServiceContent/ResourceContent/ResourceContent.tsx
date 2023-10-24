import React, { ReactNode, useState } from 'react';
import classes from './ResourceContent.module.css';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useTranslation } from 'react-i18next';
import { ResourceNameAndId } from 'resourceadm/components/ResourceNameAndId';
import { replaceWhiteSpaceWithHyphens } from 'resourceadm/utils/stringUtils';

export type ResourceContentProps = {
  altinn2LinkService: Altinn2LinkService;
  resourceIdExists: boolean;
};

/**
 * @component
 *    Displays the Resource content in the import resource from Altinn 2 modal
 *
 * @property {Altinn2LinkService}[altinn2LinkService] - The service to import from
 * @property {boolean}[resourceIdExists] - If the id already exists
 *
 * @returns {ReactNode} - The rendered component
 */
export const ResourceContent = ({
  altinn2LinkService,
  resourceIdExists,
}: ResourceContentProps): ReactNode => {
  const { t } = useTranslation();

  const [id, setId] = useState(altinn2LinkService.serviceName);
  const [title, setTitle] = useState(altinn2LinkService.serviceName);

  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);
  const [bothFieldsHaveSameValue, setBothFieldsHaveSameValue] = useState(true);

  /**
   * Replaces the spaces in the value typed with '-'.
   */
  const handleIDInput = (val: string) => {
    setId(replaceWhiteSpaceWithHyphens(val));
  };

  /**
   * Updates the value of the title. If the edit field is not open,
   * then it updates the ID to the same as the title.
   *
   * @param val the title value typed
   */
  const handleEditTitle = (val: string) => {
    if (!editIdFieldOpen && bothFieldsHaveSameValue) {
      handleIDInput(val);
    }
    setTitle(val);
  };

  /**
   * Handles the click of the edit button. If we click the edit button
   * so that it closes the edit field, the id is set to the title.
   *
   * @param isOpened the value of the button when it is pressed
   * @param saveChanges flag for if the changes made should be saved
   */
  const handleClickEditButton = (isOpened: boolean, saveChanges: boolean) => {
    setEditIdFieldOpen(isOpened);
    if (saveChanges) {
      setBothFieldsHaveSameValue(false);
      return;
    }
    if (!isOpened) {
      setBothFieldsHaveSameValue(true);
      const shouldSetTitleToId = title !== id;
      if (shouldSetTitleToId) {
        setId(replaceWhiteSpaceWithHyphens(title));
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
        handleClickEditButton={(saveChanges: boolean) =>
          handleClickEditButton(!editIdFieldOpen, saveChanges)
        }
        resourceIdExists={resourceIdExists}
        bothFieldsHaveSameValue={bothFieldsHaveSameValue}
      />
    </div>
  );
};
