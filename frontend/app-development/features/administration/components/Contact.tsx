import React from 'react';
import classes from './Contact.module.css';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, ChevronRightIcon } from '@navikt/aksel-icons';
import Slack from 'app-shared/icons/Slack.svg';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { AltinnSpinner } from 'app-shared/components';
import { Center } from 'app-shared/components/Center';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { PageContainer } from './PageContainer';

export const Contact = () => {
  const { org, app } = useStudioUrlParams();

  const {
    data: appConfigData,
    isError: isAppConfigError,
    isLoading: isLoadingAppConfig,
  } = useAppConfigQuery(org, app, { hideDefaultError: true });
  const { t } = useTranslation();

  if (isAppConfigError) {
    toast.error(t('contact.fetch_app_error_message'));
  }

  if (isLoadingAppConfig) {
    return (
      <Center>
        <AltinnSpinner spinnerText={t('general.loading')} className={classes.spinner} />
      </Center>
    );
  }

  const appName = appConfigData?.serviceName || app;

  return (
    <PageContainer>
      <div className={classes.container}>
        <div className={classes.breadcrumb}>
          <Link href={RoutePaths.Overview}>{appName}</Link>
          <ChevronRightIcon />
          {t('contact.heading')}
        </div>
        <div className={classes.content}>
          <div className={classes.heading}>
            <Heading size='small' spacing>
              {t('contact.heading')}
            </Heading>
          </div>
          <div className={classes.block}>
            <div className={classes.iconContainer}>
              <EnvelopeClosedIcon className={classes.icon} />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing className={classes.subHeading}>
                {t('contact.email.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.email.content')}</Paragraph>
              <Paragraph className={classes.link}>
                <Trans i18nKey='contact.email.link'>
                  <Link> </Link>
                </Trans>
              </Paragraph>
            </div>
          </div>
          <div className={classes.block}>
            <div className={classes.iconContainer}>
              <Slack />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing className={classes.subHeading}>
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
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
