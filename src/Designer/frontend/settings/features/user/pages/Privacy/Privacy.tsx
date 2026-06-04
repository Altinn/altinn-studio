import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import { ConsentForm } from 'app-shared/components/ConsentBanner/ConsentForm';
import { toast } from 'react-toastify';
import classes from './Privacy.module.css';

export const Privacy = (): ReactElement => {
  const { t } = useTranslation();

  const handleSave = (): void => {
    toast.success(t('settings.user.privacy.saved'));
  };

  return (
    <div className={classes.container}>
      <StudioHeading level={2} data-size='md'>
        {t('settings.user.privacy.heading')}
      </StudioHeading>
      <div className={classes.content}>
        <ConsentForm onSave={handleSave} />
      </div>
    </div>
  );
};
