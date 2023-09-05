import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Button, Label, TextField } from '@digdir/design-system-react';
import { MultiplyIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';

export type PolicyResourceFieldsProps = {
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
  /**
   * Unique id of the field
   */
  uniqueId: string;
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
 * @property {string}[uniqueId] - Unique id of the field
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
  uniqueId,
}: PolicyResourceFieldsProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <div className={classes.inputWrapper}>
        <div className={classes.textfieldWrapper}>
          {!canEditTypeAndId && (
            <Label spacing size='small' as='p' className={classes.label}>
              Type
            </Label>
          )}
          <TextField
            value={valueType}
            onChange={(e) => onChangeType(e.target.value)}
            readOnly={!canEditTypeAndId}
            id={'resourceType' + uniqueId}
            onBlur={onBlur}
            aria-label={t('policy_editor.narrowing_list_field_type')}
          />
        </div>
        <div className={classes.textfieldWrapper}>
          {!canEditTypeAndId && (
            <Label spacing size='small' as='p' className={classes.label}>
              Id
            </Label>
          )}
          <TextField
            value={valueId}
            onChange={(e) => onChangeId(e.target.value)}
            readOnly={!canEditTypeAndId}
            id={'resourceId' + uniqueId}
            onBlur={onBlur}
            aria-label={t('policy_editor.narrowing_list_field_id')}
          />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {canEditTypeAndId && (
          <Button
            variant='quiet'
            icon={<MultiplyIcon title={t('policy_editor.narrowing_list_field_delete')} />}
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
