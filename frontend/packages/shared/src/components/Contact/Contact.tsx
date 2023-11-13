import React from 'react';
import classes from './Contact.module.css';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, ChevronRightIcon } from '@navikt/aksel-icons';
import Slack from 'app-shared/icons/Slack.svg';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { PageContainer } from 'app-shared/components/PageContainer/PageContainer';

export const Contact = () => {
  const { org, app } = useStudioUrlParams();

  const { data: appConfigData, isError: isAppConfigError } = useAppConfigQuery(org, app, {
    hideDefaultError: true,
  });
  const { t } = useTranslation();

  if (isAppConfigError) {
    toast.error(t('contact.fetch_app_error_message'));
  }

  const appName = appConfigData?.serviceName || app;

  return (
    <PageContainer>
      <div className={classes.container}>
        <nav aria-label='Breadcrumb'>
          <ol className={classes.breadcrumb}>
            <li className={classes.breadcrumbItem}>
              <Link href={RoutePaths.Overview}>{appName}</Link>
              <ChevronRightIcon />
            </li>
            <li className={classes.breadcrumbItem}>
              <span aria-current='page'>{t('general.contact')}</span>
            </li>
          </ol>
        </nav>
        <div className={classes.content}>
          <div>
            <Heading size='medium' spacing>
              {t('general.contact')}
            </Heading>
          </div>
          <section className={classes.section}>
            <div className={classes.iconContainer}>
              <EnvelopeClosedIcon className={classes.icon} />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing>
                {t('contact.email.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.email.content')}</Paragraph>
              <Paragraph className={classes.link}>
                <Trans i18nKey='contact.email.link'>
                  <Link> </Link>
                </Trans>
              </Paragraph>
            </div>
          </section>
          <section className={classes.section}>
            <div className={classes.iconContainer}>
              <Slack />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing>
                {t('contact.slack.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.slack.content')}</Paragraph>
              <Paragraph spacing as='ul'>
                <Trans i18nKey='contact.slack.content_list'>
                  <li />
                </Trans>
              </Paragraph>
              <Paragraph className={classes.link}>
                <Trans i18nKey='contact.slack.link'>
                  <Link> </Link>
                </Trans>
              </Paragraph>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
};
