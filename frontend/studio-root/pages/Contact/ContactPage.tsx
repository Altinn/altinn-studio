import React from 'react';
import classes from './ContactPage.module.css';
import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, SlackIcon, GitHubIcon } from '@studio/icons';
import classNames from 'classnames';
import { GetInTouchWith } from 'app-shared/getInTouch';
import {
  EmailContactProvider,
  GitHubIssueContactProvider,
  SlackContactProvider,
} from 'app-shared/getInTouch/providers';
import { StudioPageImageBackgroundContainer } from '@studio/components';

export const ContactPage = (): React.ReactElement => {
  const { t } = useTranslation();
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
  const contactBySlack = new GetInTouchWith(new SlackContactProvider());
  const contactByGitHubIssue = new GetInTouchWith(new GitHubIssueContactProvider());

  return (
    <StudioPageImageBackgroundContainer image='/designer/img/page-background.svg'>
      <div className={classes.container}>
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
              <Link href={contactByEmail.url('serviceDesk')}>
                {t('general.service_desk.email')}
              </Link>
            </div>
          </section>
          <section className={classes.section}>
            <div className={classes.iconContainer}>
              <SlackIcon className={classes.icon} />
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
              <Link href={contactBySlack.url('product-altinn-studio')}>
                {t('contact.slack.link')}
              </Link>
            </div>
          </section>
          <section className={classes.section}>
            <div className={classNames(classes.iconContainer)}>
              <GitHubIcon className={classes.icon} />
            </div>
            <div className={classes.textContainer}>
              <Heading level={2} size='xsmall' spacing>
                {t('contact.github_issue.heading')}
              </Heading>
              <Paragraph spacing>{t('contact.github_issue.content')}</Paragraph>
              <Link href={contactByGitHubIssue.url('choose')}>
                {t('contact.github_issue.link_label')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </StudioPageImageBackgroundContainer>
  );
};
