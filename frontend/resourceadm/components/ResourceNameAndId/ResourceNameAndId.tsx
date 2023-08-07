import React from 'react';
import classes from './ResourceNameAndId.module.css';
import { Button, TextField, ErrorMessage, Paragraph, Label } from '@digdir/design-system-react';
import { MultiplyIcon, PencilWritingIcon, CheckmarkIcon } from '@navikt/aksel-icons';

interface Props {
  isEditOpen: boolean;
  title: string;
  id: string;
  handleEditTitle: (s: string) => void;
  handleIdInput: (s: string) => void;
  handleClickEditButton: (isSave: boolean) => void;
  resourceIdExists: boolean;
  titleAndIdSame: boolean;
}

/**
 * Displays the title and Id of a new resource that is either being
 * created new, or migrated from Altinn 2.
 *
 * @param props.isEditOpen flag to decide if the edit ID is open or not
 * @param props.title the value of the title
 * @param props.id the value of the id
 * @param props.handleEditTitle function to handle the editing of the title
 * @param props.handleEditId function to handle the editing of the id
 * @param props.handleClickEditButton function to be executed when edit button is clicked
 * @param props.resourceIdExists flag for id the ID already exists
 * @param props.titleAndIdSame flag for if ID and title has same display value
 */
export const ResourceNameAndId = ({
  isEditOpen,
  title,
  id,
  handleEditTitle,
  handleIdInput,
  handleClickEditButton,
  resourceIdExists,
  titleAndIdSame,
}: Props) => {
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
    } else if (!titleAndIdSame) {
      return formatString(id);
    } else {
      return formatString(title);
    }
  };

  return (
    <>
      <Paragraph size='medium'>Velg navn og id for ressursen.</Paragraph>
      <Label className={classes.label} size='small'>
        Ressursnavn (Bokmål)
      </Label>
      <div className={classes.textfieldWrapper}>
        <TextField
          placeholder='Ressursnavn (Bokmål)'
          value={title}
          onChange={(e) => handleEditTitle(e.target.value)}
          aria-label='Ressursnavn (Bokmål)'
        />
      </div>
      <Label className={classes.label} size='small'>
        Ressurs id
      </Label>
      <div className={classes.editFieldWrapper}>
        {isEditOpen ? (
          <>
            <div className={classes.textfieldWrapper}>
              <TextField
                placeholder='Ressurs id'
                value={id}
                onChange={(e) => handleIdInput(e.target.value)}
                aria-label='Ressurs id'
                isValid={!resourceIdExists}
              />
            </div>
            <div className={classes.buttonWrapper}>
              <div className={classes.stopEditingButton}>
                <Button
                  onClick={() => handleClickEditButton(false)}
                  variant='quiet'
                  color='danger'
                  icon={<MultiplyIcon title='Slett ny ressurs id' />}
                />
              </div>
              <Button
                onClick={() => handleClickEditButton(true)}
                variant='quiet'
                icon={<CheckmarkIcon title='Bruk ny ressurs id' />}
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
                icon={<PencilWritingIcon title='Endre ressurs id' />}
                variant='quiet'
                color='primary'
              >
                Rediger
              </Button>
            </div>
          </>
        )}
      </div>
      <div className={classes.resourceIdError}>
        {resourceIdExists && (
          <ErrorMessage size='small'>Ressurs med valgt id eksisterer allerede.</ErrorMessage>
        )}
      </div>
    </>
  );
};
