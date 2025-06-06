import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTag } from '@studio/components-legacy';
import classes from './ResourcePageInputs.module.css';

interface ResourceFieldHeaderProps {
  label: string;
  required?: boolean;
}

export const ResourceFieldHeader = ({
  label,
  required,
}: ResourceFieldHeaderProps): React.ReactNode => {
  const { t } = useTranslation();
  return (
    <div className={classes.resourceFieldHeader}>
      {label}
      {required && (
        <StudioTag color='warning' size='sm' aria-hidden>
          {t('resourceadm.about_resource_required_field')}
        </StudioTag>
      )}
    </div>
  );
};
