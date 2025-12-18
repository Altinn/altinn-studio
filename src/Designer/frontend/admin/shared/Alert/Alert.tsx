import type { ReactElement } from 'react';
import React from 'react';
import classes from './Alert.module.css';
import type { StudioAlertProps } from '@studio/components';
import { StudioAlert, StudioLink } from '@studio/components';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

type AlertMetricProps = {
  color: string;
  count: string;
  title: string;
  url?: string;
  children?: ReactElement;
} & StudioAlertProps;

export const Alert = ({
  color,
  count,
  title,
  url,
  children,
  className,
  ...rest
}: AlertMetricProps) => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color={color} className={cn(classes.metric, className)} {...rest}>
      <div className={classes.heading}>
        <span className={classes.title}>
          <span className={classes.count}>{count}</span>
          {title}
        </span>
        {url && (
          <StudioLink href={url} rel='noopener noreferrer' target='_blank' className={classes.link}>
            {t('admin.metrics.errors.link')}
          </StudioLink>
        )}
      </div>
      {children && <div className={classes.chart}>{children}</div>}
    </StudioAlert>
  );
};
