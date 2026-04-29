import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioError,
  StudioHeading,
  StudioList,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components';
import { BellIcon } from '@studio/icons';
import { useGetContactPointsQuery } from '../../hooks/useGetContactPointsQuery';
import { PersonsList } from './components/PersonsList/PersonsList';
import { SlackChannelsList } from './components/SlackChannelsList/SlackChannelsList';
import classes from './ContactPoints.module.css';
import type { ContactPoint } from 'app-shared/types/ContactPoint';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';

const isSlackChannel = (cp: ContactPoint): boolean =>
  cp.methods.some((m) => m.methodType === 'slack');

export const ContactPoints = (): ReactElement => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams(['owner']);

  const { data: contactPoints, isPending, isError } = useGetContactPointsQuery(org);

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.orgs.contact_points.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.orgs.contact_points.error')}</StudioError>;
  }

  const persons = (contactPoints ?? []).filter((cp) => !isSlackChannel(cp));
  const channels = (contactPoints ?? []).filter(isSlackChannel);

  return (
    <div className={classes.container}>
      <StudioHeading level={2} data-size='md'>
        {t('settings.orgs.contact_points.contact_points')}
      </StudioHeading>
      <div className={classes.description}>
        <div>
          <StudioHeading level={3} spacing>
            {t('settings.orgs.contact_points.description_heading')}
          </StudioHeading>
          <StudioParagraph data-size='md' className={classes.descriptionText}>
            {t('settings.orgs.contact_points.description_body')}
          </StudioParagraph>
        </div>
        <div className={classes.alertBox}>
          <div className={classes.alertBoxHeading}>
            <BellIcon aria-hidden data-size='lg' />
            <StudioHeading level={3}>
              {t('settings.orgs.contact_points.alert_heading')}
            </StudioHeading>
          </div>
          <StudioList.Unordered>
            <StudioList.Item>
              {t('settings.orgs.contact_points.alert_item_publish')}
            </StudioList.Item>
            <StudioList.Item>
              {t('settings.orgs.contact_points.alert_item_instantiation')}
            </StudioList.Item>
            <StudioList.Item>
              {t('settings.orgs.contact_points.alert_item_process_next')}
            </StudioList.Item>
          </StudioList.Unordered>
        </div>
      </div>
      <section className={classes.section}>
        <PersonsList org={org} persons={persons} />
      </section>
      <section className={classes.section}>
        <SlackChannelsList org={org} channels={channels} />
      </section>
    </div>
  );
};
