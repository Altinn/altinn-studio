import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '@digdir/design-system-react';
import classes from './EmptyGroupContent.module.css';

export const EmptyGroupContent = () => {
  const { t } = useTranslation();
  return (
    <Paragraph className={classes.root} size='small'>
      {t('ux_editor.container_empty')}
    </Paragraph>
  );
};
