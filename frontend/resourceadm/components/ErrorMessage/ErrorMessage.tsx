import type { ReactNode } from 'react';
import React from 'react';
import classes from './errorMessage.module.css';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

type ErrorMessageProps = {
  title: string;
  message: string;
  children?: ReactNode;
};

export const ErrorMessage = ({
  title,
  message,
  children,
}: ErrorMessageProps): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className={classes.errorMessage}>
      <Heading size='medium' level={1}>
        {title}
      </Heading>
      <Paragraph size='small'>{message}</Paragraph>
      <Paragraph size='small'>{t('resourceadm.dashboard_error_message_info')}</Paragraph>
      {children}
    </div>
  );
};
