import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Textfield } from '@digdir/design-system-react';
import { MultiplyIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';

export type PolicyResourceFieldsProps = {
  canEditTypeAndId: boolean;
  onRemove: () => void;
  valueId: string;
  onChangeId: (s: string) => void;
  valueType: string;
  onChangeType: (s: string) => void;
  onBlur: () => void;
};

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
            <StudioLabelAsParagraph spacing size='small' className={classes.label}>
              Type
            </StudioLabelAsParagraph>
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
            <StudioLabelAsParagraph spacing size='small' className={classes.label}>
              Id
            </StudioLabelAsParagraph>
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
            icon={<MultiplyIcon />}
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
