import { StudioButton, StudioParagraph, StudioTextfield } from '@studio/components-legacy';
import { CheckmarkIcon, MultiplyIcon, PencilWritingIcon } from '@studio/icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './ResourceNameAndId.module.css';
import { formatIdString } from '../../utils/stringUtils';

export type ResourceNameAndIdProps = {
  idLabel: string;
  titleLabel: string;
  id: string;
  title: string;
  onTitleChange: (s: string) => void;
  onIdChange: (s: string) => void;
  conflictErrorMessage?: string;
};

/**
 * @component
 *    Displays the title and Id of a new resource that is either being
 *    created new, or migrated from Altinn 2.
 *
 * @property {string}[idLabel] - The label of the id field
 * @property {string}[titleLabel] - The label of the title field
 * @property {string}[title] - The value of the title
 * @property {string}[id] - The value of the id
 * @property {function}[onTitleChange] - Function to handle the editing of the title
 * @property {function}[onIdChange] - Function to handle the editing of the id
 * @property {string}[conflictErrorMessage] - Error message to display in the id field
 *
 * @returns {React.JSX.Element} - If there should be space on top of the component
 */
export const ResourceNameAndId = ({
  idLabel,
  titleLabel,
  id,
  title,
  onTitleChange,
  onIdChange,
  conflictErrorMessage,
}: ResourceNameAndIdProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);
  const [bothFieldsHaveSameValue, setBothFieldsHaveSameValue] = useState(true);

  useEffect(() => {
    if (conflictErrorMessage) {
      setEditIdFieldOpen(true);
    }
  }, [conflictErrorMessage]);

  /**
   * Replaces the spaces in the value typed with '-'.
   */
  const handleEditId = (val: string) => {
    const newId = formatIdString(val);
    onIdChange(newId);
  };

  /**
   * Updates the value of the title. If the edit field is not open,
   * then it updates the ID to the same as the title.
   *
   * @param val the title value typed
   */
  const handleEditTitle = (val: string) => {
    if (!editIdFieldOpen && bothFieldsHaveSameValue) {
      handleEditId(val);
    }
    onTitleChange(val);
  };
  /**
   * Handles the click of the edit button. If we click the edit button
   * so that it closes the edit field, the id is set to the title.
   *
   * @param saveChanges if the save button is pressed, keep id and title separate
   */
  const handleClickEditButton = (saveChanges: boolean) => {
    setEditIdFieldOpen((old) => !old);
    if (saveChanges) {
      setBothFieldsHaveSameValue(false);
    }
    if (!saveChanges && editIdFieldOpen) {
      setBothFieldsHaveSameValue(true);
      const shouldSetTitleToId = title !== id;
      if (shouldSetTitleToId) {
        handleEditId(title);
      }
    }
  };

  /**
   * Displays either the id input field or the id text
   * @returns ReactNode
   */
  const displayIdTextOrInput = () => {
    return (
      <>
        {editIdFieldOpen ? (
          <div className={classes.editFieldWrapper}>
            <div className={classes.textfieldWrapper}>
              <StudioTextfield
                value={id}
                onChange={(e) => handleEditId(e.target.value)}
                label={idLabel}
                error={conflictErrorMessage}
              />
            </div>
            <div className={classes.buttonWrapper}>
              <StudioButton
                onClick={() => handleClickEditButton(false)}
                variant='tertiary'
                color='danger'
                title={t('resourceadm.dashboard_resource_name_and_id_delete_icon', {
                  objectType: idLabel,
                })}
                icon={<MultiplyIcon />}
              />
              <StudioButton
                onClick={() => handleClickEditButton(true)}
                variant='tertiary'
                title={t('resourceadm.dashboard_resource_name_and_id_checkmark_icon', {
                  objectType: idLabel,
                })}
                icon={<CheckmarkIcon />}
              />
            </div>
          </div>
        ) : (
          <div className={classes.editFieldWrapper}>
            <div>
              <p className={classes.idText}>id</p>
            </div>
            <StudioParagraph size='sm'>
              <strong>{formatIdString(id)}</strong>
            </StudioParagraph>
            <div className={classes.editButtonWrapper}>
              <StudioButton
                onClick={() => handleClickEditButton(false)}
                variant='tertiary'
                color='first'
                icon={<PencilWritingIcon />}
                iconPlacement='right'
                aria-label={t('resourceadm.dashboard_resource_name_and_id_change', {
                  objectType: idLabel,
                })}
              >
                {t('general.edit')}
              </StudioButton>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={classes.resourceNameAndId}>
      <div className={classes.textfieldWrapper}>
        <StudioTextfield
          value={title}
          onChange={(e) => handleEditTitle(e.target.value)}
          label={titleLabel}
        />
      </div>
      {displayIdTextOrInput()}
    </div>
  );
};
