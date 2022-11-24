import type { ReactNode } from 'react';
import React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from '../hooks';
import classes from './ResourceItem.module.css';

export interface ResourceItemProps {
  link: string;
  label: string;
  description: string;
  icon: ReactNode;
}

export function ResourceItem({ link, label, description, icon }: ResourceItemProps) {
  const language = useAppSelector((state) => state.language.language);
  return (
    <div className={classes.resourceItem}>
      <div>{icon}</div>
      <div>
        <a href={link} target='_blank' rel='noopener noreferrer'>
          {getLanguageFromKey(label, language)}
        </a>
        <p style={{ marginTop: 0 }}>{getLanguageFromKey(description, language)}</p>
      </div>
    </div>
  );
}
