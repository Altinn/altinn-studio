import type { ReactNode } from 'react';
import React from 'react';
import classes from './ResourceItem.module.css';
import { useTranslation } from 'react-i18next';

export interface ResourceItemProps {
  link: string;
  label: string;
  description: string;
  icon: ReactNode;
}

export function ResourceItem({ link, label, description, icon }: ResourceItemProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.resourceItem}>
      <div>{icon}</div>
      <div>
        <a href={link} target='_blank' rel='noopener noreferrer'>
          {t(label)}
        </a>
        <p style={{ marginTop: 0 }}>{t(description)}</p>
      </div>
    </div>
  );
}
