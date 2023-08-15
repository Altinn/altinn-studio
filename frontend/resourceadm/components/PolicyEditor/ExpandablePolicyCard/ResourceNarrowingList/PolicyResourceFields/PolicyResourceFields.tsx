import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Button, TextField } from '@digdir/design-system-react';
import { MultiplyIcon } from '@navikt/aksel-icons';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

interface Props {
  isEditable: boolean;
  onRemove: () => void;
  valueId: string;
  onChangeId: (s: string) => void;
  valueType: string;
  onChangeType: (s: string) => void;
}

/**
 * Component that displays two input fields next to each other, and a button
 * to remove the component from the list it belongs to. It is used to display
 * resources for a policy rules in the policy editor.
 *
 * @param props.isEditable boolean to decide if the two textfields are editable or not.
 * @param props.onRemove function to be executed when the remove button is clicked
 * @param props.valueId the value of the id field
 * @param props.onChangeId function to be executed when the id value changes
 * @param props.valueType the value of the type field
 * @param props.onChangeType function to be executed when the type value changes
 */
export const PolicyResourceFields = ({
  isEditable,
  onRemove,
  valueId,
  valueType,
  onChangeId,
  onChangeType,
}: Props) => {
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
            onClick={isEditable && onRemove}
            color='danger'
            hidden={!isEditable}
          />
        )}
      </div>
    </div>
  );
};
