import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Button, TextField } from '@digdir/design-system-react';
import { MultiplyIcon } from '@navikt/aksel-icons';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

type PolicyResourceFieldsProps = {
  /**
   * Flag for if the fields are ediable or not
   */
  canEditTypeAndId: boolean;
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
  /**
   * Function to be executed on blur
   * @returns
   */
  onBlur: () => void;
};

/**
 * @component
 *    Component that displays two input fields next to each other, and a button
 *    to remove the component from the list it belongs to. It is used to display
 *    resources for a policy rules in the policy editor.
 *
 * @property {boolean}[canEditTypeAndId] - Flag for if the fields are ediable or not
 * @property {function}[onRemove] - Function to be executed when the remove button is clicked
 * @property {string}[valueId] - The value of the id field
 * @property {function}[onChangeId] - Function to be executed when the id value changes
 * @property {string}[valueType] - The value of the type field
 * @property {function}[onChangeType] - Function to be executed when the type value changes
 * @property {function}[onBlur] - Function to be executed on blur
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const PolicyResourceFields = ({
  canEditTypeAndId,
  onRemove,
  valueId,
  valueType,
  onChangeId,
  onChangeType,
  onBlur,
}: PolicyResourceFieldsProps): React.ReactNode => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.inputWrapper}>
        <div className={classes.textfieldWrapper}>
          <TextField
            placeholder='Type'
            value={valueType}
            label={!canEditTypeAndId && 'Type'}
            onChange={(e) => onChangeType(e.target.value)}
            readOnly={!canEditTypeAndId}
            aria-labelledby='resourceType'
            onBlur={onBlur}
          />
          <ScreenReaderSpan id='resourceType' label='Ressurstype' />
        </div>
        <div className={classes.textfieldWrapper}>
          <TextField
            placeholder='Id'
            value={valueId}
            label={!canEditTypeAndId && 'Id'}
            onChange={(e) => onChangeId(e.target.value)}
            readOnly={!canEditTypeAndId}
            aria-labelledby='resourceId'
            onBlur={onBlur}
          />
          <ScreenReaderSpan id='resourceId' label='Ressurs id' />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {canEditTypeAndId && (
          <Button
            variant='quiet'
            icon={<MultiplyIcon title='Fjern ressursen' />}
            aria-disabled={!canEditTypeAndId}
            onClick={onRemove}
            color='danger'
            hidden={!canEditTypeAndId}
            size='small'
          />
        )}
      </div>
    </div>
  );
};
