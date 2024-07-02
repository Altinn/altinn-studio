import React from 'react';
import classes from './Contact.module.css';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, SlackIcon, GitHubIcon } from '@studio/icons';
import { PageContainer } from 'app-shared/components/PageContainer/PageContainer';
import classNames from 'classnames';

export const Contact = () => {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <div className={classes.container}>
        <div className={classes.content}>
          <div>
            <Heading size='medium' spacing>
              {t('general.contact')}
            </Heading>
          </div>
          <section className={classes.section}>
            <div className={classes.iconContainer}>
              <EnvelopeClosedIcon className={classes.emailIcon} />
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
              {/*<Slack />*/}
              <SlackIcon />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing>
                {t('contact.slack.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.slack.content')}</Paragraph>
              <Paragraph spacing asChild>
                <ul>
                  <Trans i18nKey='contact.slack.content_list'>
                    <li />
                  </Trans>
                </ul>
              </Paragraph>
              <Paragraph className={classes.link}>
                <Trans i18nKey='contact.slack.link'>
                  <Link> </Link>
                </Trans>
              </Paragraph>
            </div>
          </section>
          <section className={classes.section}>
            <div className={classNames(classes.iconContainer, classes.githubIcon)}>
              <GitHubIcon />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing>
                {t('contact.github_issue.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.github_issue.content')}</Paragraph>
              <Paragraph className={classes.link}>
                <Trans i18nKey='contact.github_issue.link'>
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
