import React from 'react';
import classes from './ContactPage.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { EnvelopeClosedIcon, SlackIcon, GitHubIcon, PersonHeadsetIcon } from '@studio/icons';
import { GetInTouchWith } from 'app-shared/getInTouch';
import {
  EmailContactProvider,
  GitHubIssueContactProvider,
  SlackContactProvider,
} from 'app-shared/getInTouch/providers';
import {
  StudioParagraph,
  StudioHeading,
  StudioPageImageBackgroundContainer,
} from '@studio/components';
import { ContactSection, type ContactSectionProps } from '../../components/ContactSection';
import { ContactServiceDesk } from '../../components/ContactServiceDesk';
import { useFetchBelongsToOrgQuery } from '../hooks/queries/useFetchBelongsToOrgQuery';

type ContactSectionMetadata = {
  shouldHideSection?: boolean;
};

export const ContactPage = (): React.ReactElement => {
  const { t } = useTranslation();
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
  const contactBySlack = new GetInTouchWith(new SlackContactProvider());
  const contactByGitHubIssue = new GetInTouchWith(new GitHubIssueContactProvider());

  const { data: belongsToOrgData } = useFetchBelongsToOrgQuery();

  const contactSections: Array<ContactSectionProps & ContactSectionMetadata> = [
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
        <ul>
          <StudioParagraph data-size='md'>
            <Trans i18nKey='contact.slack.content_list'>
              <li />
            </Trans>
          </StudioParagraph>
        </ul>
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
    {
      title: t('contact.altinn_servicedesk.heading'),
      additionalContent: <ContactServiceDesk />,
      description: t('contact.altinn_servicedesk.content'),
      Icon: PersonHeadsetIcon,
      shouldHideSection: !belongsToOrgData?.belongsToOrg,
    },
  ];

  return (
    <StudioPageImageBackgroundContainer image='/designer/img/page-background.svg'>
      <div className={classes.container}>
        <div className={classes.content}>
          <div>
            <StudioHeading level={1} spacing>
              {t('general.contact')}
            </StudioHeading>
          </div>
          {contactSections.filter(filterHiddenSections).map((contactSection) => (
            <ContactSection {...contactSection} key={contactSection.title} />
          ))}
        </div>
      </div>
    </StudioPageImageBackgroundContainer>
  );
};

function filterHiddenSections(section: ContactSectionProps & ContactSectionMetadata): boolean {
  return !section.shouldHideSection;
}
