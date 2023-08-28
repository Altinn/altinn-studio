import React from 'react';
import classes from './ResourceNameAndId.module.css';
import { Button, TextField, ErrorMessage, Paragraph, Label } from '@digdir/design-system-react';
import { MultiplyIcon, PencilWritingIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next'

type ResourceNameAndIdProps = {
  /**
   * Flag to decide if the edit ID is open or not
   */
  isEditOpen: boolean;
  /**
   * The value of the title
   */
  title: string;
  /**
   * The text to display above the fields
   */
  text: string;
  /**
   * The value of the id
   */
  id: string;
  /**
   * Function to handle the editing of the title
   * @param s the text written
   * @returns void
   */
  handleEditTitle: (s: string) => void;
  /**
   * Function to handle the editing of the id
   * @param s the text written
   * @returns void
   */
  handleIdInput: (s: string) => void;
  /**
   * Function to be executed when edit button is clicked
   * @param isSave flag for if it is to save or cancel
   * @returns void
   */
  handleClickEditButton: (isSave: boolean) => void;
  /**
   * Flag for id the ID already exists
   */
  resourceIdExists: boolean;
  /**
   * Flag for if ID and title has same display value
   */
  bothFieldsHaveSameValue: boolean;
};

/**
 * @component
 *    Displays the title and Id of a new resource that is either being
 *    created new, or migrated from Altinn 2.
 *
 * @property {boolean}[isEditOpen] - Flag to decide if the edit ID is open or not
 * @property {string}[title] - The value of the title
 * @property {string}[text] - The text to display above the fields
 * @property {string}[id] - The value of the id
 * @property {function}[handleEditTitle] - Function to handle the editing of the title
 * @property {function}[handleIdInput] - Function to handle the editing of the id
 * @property {function}[handleClickEditButton] - Function to be executed when edit button is clicked
 * @property {boolean}[resourceIdExists] - Flag for id the ID already exists
 * @property {boolean}[bothFieldsHaveSameValue] - Flag for if ID and title has same display value
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceNameAndId = ({
  isEditOpen,
  title,
  text,
  id,
  handleEditTitle,
  handleIdInput,
  handleClickEditButton,
  resourceIdExists,
  bothFieldsHaveSameValue,
}: ResourceNameAndIdProps): React.ReactNode => {
  const { t } = useTranslation();

  /**
   * Replaces spaces and '.' with '-' so that the ID looks correct
   *
   * @param s the string to format
   *
   * @returns the string formatted
   */
  const formatString = (s: string): string => {
    return s.replace(/[\s.]+/g, '-');
  };

  /**
   * If the edit field is open, then the id to dispay is the actual id
   * value, otherwise it is the title value
   *
   * @returns the formatted value
   */
  const getIdToDisplay = (): string => {
    if (isEditOpen) {
      return formatString(id);
    } else if (!bothFieldsHaveSameValue) {
      return formatString(id);
    } else {
      return formatString(title);
    }
  };

  return (
    <>
      <Paragraph size='small'>{text}</Paragraph>
      <Label className={classes.label} size='small'>
        {t('resourceadm.dahboard_resource_name_and_id_resource_name')}
      </Label>
      <div className={classes.textfieldWrapper}>
        <TextField
          value={title}
          onChange={(e) => handleEditTitle(e.target.value)}
          aria-label={t('resourceadm.dahboard_resource_name_and_id_resource_name')}
        />
      </div>
      <Label className={classes.label} size='small'>
        {t('resourceadm.dahboard_resource_name_and_id_resource_id')}
      </Label>
      <div className={classes.editFieldWrapper}>
        {isEditOpen ? (
          <>
            <div className={classes.textfieldWrapper}>
              <TextField
                value={id}
                onChange={(e) => handleIdInput(e.target.value)}
                aria-label={t('resourceadm.dahboard_resource_name_and_id_resource_id')}
                isValid={!resourceIdExists}
              />
            </div>
            <div className={classes.buttonWrapper}>
              <div className={classes.stopEditingButton}>
                <Button
                  onClick={() => handleClickEditButton(false)}
                  variant='quiet'
                  color='danger'
                  icon={<MultiplyIcon title={t('resourceadm.dahboard_resource_name_and_id_delete_icon')} />}
                  size='small'
                />
              </div>
              <Button
                onClick={() => handleClickEditButton(true)}
                variant='quiet'
                icon={<CheckmarkIcon title={t('resourceadm.dahboard_resource_name_and_id_checkmark_icon')} />}
                size='small'
              />
            </div>
          </>
        ) : (
          <>
            <div className={classes.idBox}>
              <p className={classes.idText}>id</p>
            </div>
            <Paragraph size='small'>
              {/* TODO - find out what to replace altinn.svv with if it has to be replaced? */}
              altinn.svv.<strong>{getIdToDisplay()}</strong>
            </Paragraph>
            <div className={classes.editButtonWrapper}>
              <Button
                onClick={() => handleClickEditButton(false)}
                iconPlacement='right'
                icon={<PencilWritingIcon title={t('resourceadm.dahboard_resource_name_and_id_edit_id_icon')} />}
                variant='quiet'
                color='primary'
                size='small'
              >
                {t('general.edit')}
              </Button>
            </div>
          </>
        )}
      </div>
      <div className={classes.resourceIdError}>
        {resourceIdExists && (
          <ErrorMessage size='small'>{t('resourceadm.dahboard_resource_name_and_id_erro')}</ErrorMessage>
        )}
      </div>
    </>
  );
};
