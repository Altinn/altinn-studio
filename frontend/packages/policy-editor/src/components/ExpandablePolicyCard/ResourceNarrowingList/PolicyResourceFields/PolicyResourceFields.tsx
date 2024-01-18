import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Label, Textfield } from '@digdir/design-system-react';
import { MultiplyIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';

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
          <Textfield
            value={valueType}
            size='small'
            onChange={(e) => onChangeType(e.target.value)}
            readOnly={!canEditTypeAndId}
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
          <Textfield
            value={valueId}
            size='small'
            onChange={(e) => onChangeId(e.target.value)}
            readOnly={!canEditTypeAndId}
            onBlur={onBlur}
            aria-label={t('policy_editor.narrowing_list_field_id')}
          />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {canEditTypeAndId && (
          <StudioButton
            aria-disabled={!canEditTypeAndId}
            color='danger'
            hidden={!canEditTypeAndId}
            icon={<MultiplyIcon/>}
            onClick={onRemove}
            size='small'
            title={t('policy_editor.narrowing_list_field_delete')}
            variant='tertiary'
          />
        )}
      </div>
    </div>
  );
};
