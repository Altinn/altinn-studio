import React from 'react';
import classes from './Contact.module.css';
import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, SlackIcon, GitHubIcon } from '@studio/icons';
import { PageContainer } from 'app-shared/components/PageContainer/PageContainer';
import classNames from 'classnames';
import { Contact } from 'app-shared/userFeedback';
import {
  EmailChannel,
  EmailContactProvider,
  GithubChannel,
  GitHubIssueContactProvider,
  SlackChannel,
  SlackContactProvider,
} from 'app-shared/userFeedback/providers';

export const ContactPage = (): React.ReactElement => {
  const { t } = useTranslation();
  const contactByEmail = new Contact(new EmailContactProvider());
  const contactBySlack = new Contact(new SlackContactProvider());
  const contactByGitHubIssue = new Contact(new GitHubIssueContactProvider());

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
              <Link to={contactByEmail.contactUrl('serviceDesk')}>servicedesk@altinn.no</Link>
            </div>
          </section>
          <section className={classes.section}>
            <div className={classes.iconContainer}>
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
              <Link to={contactBySlack.contactUrl('product-altinn-studio')}>
                {t('contact.slack.link')}
              </Link>
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
              <Link to={contactByGitHubIssue.contactUrl('featureRequest')}>
                {t('contact.github_issue.link')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
};
