import type { ReactNode } from 'react';
import React from 'react';
import classes from './errorMessage.module.css';
import { StudioHeading, StudioParagraph } from '@studio/components-legacy';
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
      <StudioHeading size='md' level={1}>
        {title}
      </StudioHeading>
      <StudioParagraph size='sm'>{message}</StudioParagraph>
      <StudioParagraph size='sm'>{t('resourceadm.dashboard_error_message_info')}</StudioParagraph>
      {children}
    </div>
  );
};
