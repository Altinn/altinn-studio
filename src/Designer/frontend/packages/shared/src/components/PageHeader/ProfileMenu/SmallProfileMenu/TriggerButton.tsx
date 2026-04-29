import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioParagraph } from '@studio/components';
import { useUserQuery } from 'app-shared/hooks/queries';
import classes from './TriggerButton.module.css';

type TriggerButtonProps = {
  triggerButtonText: string;
};

export const TriggerButton = ({ triggerButtonText }: TriggerButtonProps): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();

  return (
    <div className={classes.profileWrapper}>
      <StudioAvatar
        src={user?.avatar_url}
        alt={t('general.profile_icon')}
        title={t('shared.header_profile_icon_text')}
      />
      <StudioParagraph data-size='md' className={classes.profileText}>
        {triggerButtonText}
      </StudioParagraph>
    </div>
  );
};
