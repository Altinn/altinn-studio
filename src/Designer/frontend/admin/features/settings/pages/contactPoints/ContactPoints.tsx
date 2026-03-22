import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioSpinner } from '@studio/components';
import { useGetOrgAlertContactPointsQuery } from '../../hooks/useGetOrgAlertContactPointsQuery';
import { PersonsList } from './components/PersonsList/PersonsList';
import { SlackChannelsList } from './components/SlackChannelsList/SlackChannelsList';
import classes from './ContactPoints.module.css';
import type { OrgAlertContactPoint } from 'app-shared/types/OrgAlertContactPoint';

const isSlackChannel = (cp: OrgAlertContactPoint): boolean =>
  cp.methods.some((m) => m.methodType === 'slack_webhook');

export const ContactPoints = (): ReactElement => {
  const { t } = useTranslation();
  const { org } = useParams<{ org: string }>();

  const { data: contactPoints, isPending } = useGetOrgAlertContactPointsQuery(org!);

  if (isPending) {
    return <StudioSpinner spinnerTitle='' aria-hidden='true' />;
  }

  const persons = (contactPoints ?? []).filter((cp) => !isSlackChannel(cp));
  const channels = (contactPoints ?? []).filter(isSlackChannel);

  return (
    <div className={classes.container}>
      <StudioHeading level={2}>{t('org.settings.contact_points.contact_points')}</StudioHeading>
      <section className={classes.section}>
        <PersonsList org={org!} persons={persons} />
      </section>
      <section className={classes.section}>
        <SlackChannelsList org={org!} channels={channels} />
      </section>
    </div>
  );
};
