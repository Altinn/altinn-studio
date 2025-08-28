import React from 'react';
import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';
import { Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './FormLayoutWarning.module.css';

interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout).join(', ');
  const { t } = useTranslation();
  return (
    <div className={classes.warningWrapper}>
      <Paragraph size='small'>
        {t('ux_editor.formLayout.warning_duplicates')}
        <span className={classes.duplicatedId}> {duplicatedIds}</span>
      </Paragraph>
      <Paragraph size='small'>
        {t('ux_editor.formLayout.warning_duplicates.cannot_publish')}
      </Paragraph>
    </div>
  );
};
