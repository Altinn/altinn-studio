import React, { type ReactElement } from 'react';
import classes from './NoItemSelectedMessage.module.css';
import { StudioLabelAsParagraph } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';

export const NoItemSelectedMessage = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioLabelAsParagraph size='sm' className={classes.noItem}>
      {t('schema_editor.no_item_selected')}
    </StudioLabelAsParagraph>
  );
};
