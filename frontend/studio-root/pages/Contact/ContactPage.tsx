import React from 'react';
import classes from './ContactPage.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, SlackIcon, GitHubIcon } from '@studio/icons';
import { GetInTouchWith } from 'app-shared/getInTouch';
import {
  EmailContactProvider,
  GitHubIssueContactProvider,
  SlackContactProvider,
} from 'app-shared/getInTouch/providers';
import {
  StudioPageImageBackgroundContainer,
  StudioHeading,
  StudioParagraph,
} from '@studio/components';
import { ContactSection, type ContactSectionProps } from '../../components/ContactSection';

export const ContactPage = (): React.ReactElement => {
  const { t } = useTranslation();
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
  const contactBySlack = new GetInTouchWith(new SlackContactProvider());
  const contactByGitHubIssue = new GetInTouchWith(new GitHubIssueContactProvider());

  const contactSections: Array<ContactSectionProps> = [
    {
      title: t('contact.email.heading'),
      description: t('contact.email.content'),
      link: {
        name: t('general.service_desk.email'),
        href: contactByEmail.url('serviceDesk'),
      },
      Icon: EnvelopeClosedIcon,
    },
    {
      title: t('contact.slack.heading'),
      description: t('contact.slack.content'),
      additionalContent: (
        <StudioParagraph spacing asChild>
          <ul>
            <Trans i18nKey='contact.slack.content_list'>
              <li />
            </Trans>
          </ul>
        </StudioParagraph>
      ),
      link: {
        name: t('contact.slack.link'),
        href: contactBySlack.url('product-altinn-studio'),
      },
      Icon: SlackIcon,
    },
    {
      title: t('contact.github_issue.heading'),
      description: t('contact.github_issue.content'),
      link: {
        name: t('contact.github_issue.link_label'),
        href: contactByGitHubIssue.url('choose'),
      },
      Icon: GitHubIcon,
    },
  ];

  return (
    <StudioPageImageBackgroundContainer image='/designer/img/page-background.svg'>
      <div className={classes.container}>
        <div className={classes.content}>
          <div>
            <StudioHeading size='medium' spacing>
              {t('general.contact')}
            </StudioHeading>
          </div>
          {contactSections.map((contactSection) => (
            <ContactSection {...contactSection} key={contactSection.title} />
          ))}
        </div>
      </div>
    </StudioPageImageBackgroundContainer>
  );
};
