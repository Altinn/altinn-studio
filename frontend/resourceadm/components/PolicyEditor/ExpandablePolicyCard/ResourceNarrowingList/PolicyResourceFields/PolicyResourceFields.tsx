import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Button, TextField } from '@digdir/design-system-react';
import { MultiplyIcon } from '@navikt/aksel-icons';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

interface Props {
  /**
   * Flag for if the fields are ediable or not
   */
  isEditable: boolean;
  /**
   * Function to be executed when the remove button is clicked
   * @returns void
   */
  onRemove: () => void;
  /**
   * The value of the id field
   */
  valueId: string;
  /**
   * Function to be executed when the id value changes
   * @param s the string typed
   * @returns void
   */
  onChangeId: (s: string) => void;
  /**
   * The value of the type field
   */
  valueType: string;
  /**
   * Function to be executed when the type value changes
   * @param s the string typed
   * @returns void
   */
  onChangeType: (s: string) => void;
}

/**
 * @component
 *    Component that displays two input fields next to each other, and a button
 *    to remove the component from the list it belongs to. It is used to display
 *    resources for a policy rules in the policy editor.
 *
 * @property {boolean}[isEditable] - Flag for if the fields are ediable or not
 * @property {function}[onRemove] - Function to be executed when the remove button is clicked
 * @property {string}[valueId] - The value of the id field
 * @property {function}[onChangeId] - Function to be executed when the id value changes
 * @property {string}[valueType] - The value of the type field
 * @property {function}[onChangeType] - Function to be executed when the type value changes
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const PolicyResourceFields = ({
  isEditable,
  onRemove,
  valueId,
  valueType,
  onChangeId,
  onChangeType,
}: Props): React.ReactNode => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.inputWrapper}>
        <div className={classes.textfieldWrapper}>
          <TextField
            placeholder='Type'
            value={valueType}
            label={!isEditable && 'Type'}
            onChange={(e) => onChangeType(e.target.value)}
            readOnly={!isEditable}
            aria-labelledby='resourceType'
          />
          <ScreenReaderSpan id='resourceType' label='Ressurstype' />
        </div>
        <div className={classes.textfieldWrapper}>
          <TextField
            placeholder='Id'
            value={valueId}
            label={!isEditable && 'Id'}
            onChange={(e) => onChangeId(e.target.value)}
            readOnly={!isEditable}
            aria-labelledby='resourceId'
          />
          <ScreenReaderSpan id='resourceId' label='Ressurs id' />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {isEditable && (
          <Button
            variant='quiet'
            icon={<MultiplyIcon title='Fjern ressursen' />}
            aria-disabled={!isEditable}
            onClick={onRemove}
            color='danger'
            hidden={!isEditable}
          />
        )}
      </div>
    </div>
  );
};
