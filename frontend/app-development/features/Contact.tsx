import React from 'react';
import classes from './Contact.module.css';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon } from '@navikt/aksel-icons';
import Slack from 'app-shared/icons/Slack.svg';

export const Contact = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.pageContainer}>
      <div className={classes.container}>
        <div className={classes.header}>
          <Heading size='xlarge'>{t('contact.heading')}</Heading>
        </div>
        <div className={classes.block}>
          <div className={classes.iconContainer}>
            <EnvelopeClosedIcon className={classes.icon} />
          </div>
          <div className={classes.content}>
            <Heading level={2} size='xsmall'>
              {t('contact.email.heading')}
            </Heading>
            <Paragraph>{t('contact.email.content')}</Paragraph>
            <Paragraph className={classes.link}>
              <Trans i18nKey='contact.email.link'>
                <a />
              </Trans>
            </Paragraph>
          </div>
        </div>
        <div className={classes.block}>
          <div className={classes.iconContainer}>
            <Slack />
          </div>
          <div className={classes.content}>
            <Heading level={2} size='xsmall'>
              {t('contact.slack.heading')}
            </Heading>
            <Paragraph>{t('contact.slack.content')}</Paragraph>
            <Paragraph>
              <ul>
                {t('contact.slack.content_list', { returnObjects: true }).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Paragraph>
            <Paragraph className={classes.link}>
              <Trans i18nKey='contact.slack.link'>
                <a />
              </Trans>
            </Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
};
