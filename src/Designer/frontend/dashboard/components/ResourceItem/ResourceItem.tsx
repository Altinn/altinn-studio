import type { ReactElement } from 'react';
import React from 'react';
import classes from './ResourceItem.module.css';
import { useTranslation } from 'react-i18next';
import { StudioLink } from 'libs/studio-components-legacy/src';
import { type Resource } from '../../types/Resource';

export type ResourceItemProps = {
  resource: Resource;
};

export function ResourceItem({ resource }: ResourceItemProps): ReactElement {
  const { t } = useTranslation();
  const { url, label, description, icon } = resource;
  return (
    <div className={classes.resourceItem}>
      <div>{icon}</div>
      <div>
        <StudioLink href={url} target='_blank' rel='noopener noreferrer'>
          {t(label)}
        </StudioLink>
        <p style={{ marginTop: 0 }}>{t(description)}</p>
      </div>
    </div>
  );
}
