import React from 'react';
import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioSpinner } from '@studio/components';
import { useGetOrgAlertPersonsQuery } from '../../hooks/useGetOrgAlertPersonsQuery';
import { useGetOrgAlertSlackChannelsQuery } from '../../hooks/useGetOrgAlertSlackChannelsQuery';
import { PersonsSection } from './components/PersonsSection/PersonsSection';
import { SlackChannelsSection } from './components/SlackChannelsSection/SlackChannelsSection';
import classes from './ContactPoints.module.css';

export const ContactPoints = (): ReactElement => {
  const { t } = useTranslation();
  const { org } = useParams<{ org: string }>();

  const { data: persons, isPending: isPersonsPending } = useGetOrgAlertPersonsQuery(org!);
  const { data: channels, isPending: isChannelsPending } = useGetOrgAlertSlackChannelsQuery(org!);

  if (isPersonsPending || isChannelsPending) {
    return <StudioSpinner spinnerTitle='' aria-hidden='true' />;
  }

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>{t('org.settings.contact_points.contact_points')}</StudioHeading>
      <PersonsSection org={org!} persons={persons ?? []} />
      <SlackChannelsSection org={org!} channels={channels ?? []} />
    </div>
  );
};
