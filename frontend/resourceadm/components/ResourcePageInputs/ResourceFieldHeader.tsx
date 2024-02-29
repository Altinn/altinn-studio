import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@digdir/design-system-react';
import classes from './ResourcePageInputs.module.css';

interface ResourceFieldHeaderProps {
  label: string;
  fieldId?: string;
  required?: boolean;
}

export const ResourceFieldHeader = ({
  label,
  fieldId,
  required,
}: ResourceFieldHeaderProps): React.ReactNode => {
  const { t } = useTranslation();
  return (
    <div className={classes.resourceFieldHeader}>
      {label}
      {required && (
        <Tag color='warning' size='small' aria-hidden>
          {t('resourceadm.about_resource_required_field')}
        </Tag>
      )}
    </div>
  );
};
