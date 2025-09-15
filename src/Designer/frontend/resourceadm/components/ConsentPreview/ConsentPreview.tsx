import React, { type ReactElement } from 'react';
import DOMPurify from 'dompurify';
import { renderToStaticMarkup } from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import Markdown from 'markdown-to-jsx';
import parseHtmlToReact from 'html-react-parser';
import cn from 'classnames';
import {
  StudioAlert,
  StudioButton,
  StudioHeading,
  StudioParagraph,
  StudioSwitch,
  StudioToggleGroup,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import type {
  ConsentMetadata,
  ConsentTemplate,
  SupportedLanguage,
  ValidLanguage,
} from 'app-shared/types/ResourceAdm';
import classes from './ConsentPreview.module.css';
import { resourceAdmConsentPreview } from '@studio/testing/testids';

const buttonText = {
  nb: {
    approve: 'resourceadm.about_resource_consent_preview_approve_nb',
    reject: 'resourceadm.about_resource_consent_preview_reject_nb',
    approve_poa: 'resourceadm.about_resource_consent_preview_approve_poa_nb',
    reject_poa: 'resourceadm.about_resource_consent_preview_reject_poa_nb',
  },
  nn: {
    approve: 'resourceadm.about_resource_consent_preview_approve_nn',
    reject: 'resourceadm.about_resource_consent_preview_reject_nn',
    approve_poa: 'resourceadm.about_resource_consent_preview_approve_poa_nn',
    reject_poa: 'resourceadm.about_resource_consent_preview_reject_poa_nn',
  },
  en: {
    approve: 'resourceadm.about_resource_consent_preview_approve_en',
    reject: 'resourceadm.about_resource_consent_preview_reject_en',
    approve_poa: 'resourceadm.about_resource_consent_preview_approve_poa_en',
    reject_poa: 'resourceadm.about_resource_consent_preview_reject_poa_en',
  },
};

interface ConsentPreviewProps {
  template?: ConsentTemplate;
  resourceName: SupportedLanguage;
  consentText: SupportedLanguage;
  consentMetadata: ConsentMetadata;
  isOneTimeConsent: boolean;
  language: ValidLanguage;
}

export const ConsentPreview = ({
  template,
  resourceName,
  consentText,
  consentMetadata,
  isOneTimeConsent,
  language,
}: ConsentPreviewProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [reporteeType, setReporteeType] = React.useState<'person' | 'org'>('person');
  const [isDummyMetadataEnabled, setIsDummyMetadataEnabled] = React.useState<boolean>(false);
  const [isMobileViewEnabled, setIsMobileViewEnabled] = React.useState<boolean>(false);

  if (!template) {
    return (
      <StudioAlert data-color='danger'>
        {t('resourceadm.about_resource_consent_preview_no_template')}
      </StudioAlert>
    );
  }

  const staticMetadata = isDummyMetadataEnabled
    ? {
        CoveredBy: 'BANKEN AS',
        OfferedBy: 'DIN ORGANISASJON AS',
        HandledBy: 'BANKEN IT-AVDELING AS',
        Expiration: getDummyDateString(),
      }
    : {};

  const resourceMetadata = isDummyMetadataEnabled ? getDummyResourceMetadata(consentMetadata) : {};

  const consentPreviewText = consentText ?? { nb: '', nn: '', en: '' };
  const texts = {
    title: replaceMetadata(template.texts.title[reporteeType][language], staticMetadata),
    heading: replaceMetadata(template.texts.heading[reporteeType][language], staticMetadata),
    consentMessage: template.texts.overriddenDelegationContext
      ? replaceMetadata(template.texts.overriddenDelegationContext[language], staticMetadata)
      : t('resourceadm.about_resource_consent_preview_message_placeholder'),
    serviceIntro: replaceMetadata(
      template.texts.serviceIntro[reporteeType][language],
      staticMetadata,
    ),
    resourceText: replaceMetadata(consentPreviewText[language], resourceMetadata),
    expiration: isOneTimeConsent
      ? template.texts.expirationOneTime[language]
      : replaceMetadata(template.texts.expiration[language], staticMetadata),
    handledBy: replaceMetadata(template.texts.handledBy[language], staticMetadata),
    approve: template.isPoa ? t(buttonText[language].approve_poa) : t(buttonText[language].approve),
    reject: template.isPoa ? t(buttonText[language].reject_poa) : t(buttonText[language].reject),
  };

  return (
    <div className={classes.consentPreviewPanel}>
      <div className={classes.consentPreviewInner}>
        <div className={classes.previewControls}>
          <StudioSwitch
            label={t('resourceadm.about_resource_consent_preview_mobile_view')}
            checked={isMobileViewEnabled}
            onChange={(event) => setIsMobileViewEnabled(event.target.checked)}
          />
          <StudioSwitch
            label={t('resourceadm.about_resource_consent_preview_dummy_metadata')}
            checked={isDummyMetadataEnabled}
            onChange={(event) => setIsDummyMetadataEnabled(event.target.checked)}
          />
          <StudioToggleGroup
            value={reporteeType}
            onChange={(newValue: string) => setReporteeType(newValue as 'person' | 'org')}
          >
            <StudioToggleGroup.Item value='person'>
              {t('resourceadm.about_resource_consent_preview_person')}
            </StudioToggleGroup.Item>
            <StudioToggleGroup.Item value='org'>
              {t('resourceadm.about_resource_consent_preview_org')}
            </StudioToggleGroup.Item>
          </StudioToggleGroup>
        </div>
        <div
          data-testid='consentPreviewContainer'
          className={isMobileViewEnabled ? classes.mobileView : undefined}
        >
          <div className={cn(classes.consentBlock, classes.headerBlock)}>
            <StudioHeading level={1} data-size='md'>
              {texts.title}
            </StudioHeading>
          </div>
          <div className={classes.consentBlock}>
            <div className={classes.consentContent}>
              <StudioParagraph className={classes.heading}>{texts.heading}</StudioParagraph>
              <StudioParagraph className={classes.consentMessage}>
                {texts.consentMessage}
              </StudioParagraph>
              <StudioParagraph className={classes.serviceIntro}>
                {texts.serviceIntro}
              </StudioParagraph>
              <div className={classes.consentRights}>
                <div className={classes.consentRight}>
                  <CheckmarkIcon className={classes.consentRightIcon} />
                  <div className={classes.consentRightContent}>
                    <StudioParagraph className={classes.consentRightTitle}>
                      {resourceName[language]}
                    </StudioParagraph>
                    <div data-testid={resourceAdmConsentPreview}>
                      {transformText(texts.resourceText)}
                    </div>
                  </div>
                </div>
                <StudioParagraph className={classes.expiration}>{texts.expiration}</StudioParagraph>
                <StudioParagraph className={classes.handledBy}>{texts.handledBy}</StudioParagraph>
              </div>
            </div>
            <div className={classes.buttonRow}>
              <StudioButton variant='primary' tabIndex={-1}>
                {texts.approve}
              </StudioButton>
              <StudioButton variant='tertiary' tabIndex={-1}>
                {texts.reject}
              </StudioButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const replaceMetadata = (consentText: string, metadata: { [key: string]: string }): string => {
  return Object.keys(metadata).reduce((acc, metadataKey) => {
    return acc.replaceAll(`{${metadataKey}}`, metadata[metadataKey]);
  }, consentText);
};

const getDummyResourceMetadata = (consentMetadata: ConsentMetadata) => {
  const getRandomString = () => Math.random().toString(36).substring(2, 10);
  return Object.keys(consentMetadata).reduce((acc, key) => {
    if (key.toLowerCase().indexOf('aar') > -1 || key.toLowerCase().indexOf('year') > -1) {
      acc[key] = new Date().getFullYear();
    } else if (key.toLowerCase().indexOf('dato') > -1 || key.toLowerCase().indexOf('date') > -1) {
      acc[key] = getDummyDateString();
    } else {
      acc[key] = getRandomString();
    }
    return acc;
  }, {});
};

const getDummyDateString = (): string => {
  return new Date().toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const transformText = (markdownText: string): string | ReactElement | ReactElement[] => {
  const htmlFromMarkdown = renderToStaticMarkup(
    <Markdown
      options={{
        disableParsingRawHTML: true,
      }}
    >
      {markdownText}
    </Markdown>,
  );
  const allowedTags = ['p', 'span', 'ul', 'ol', 'li', 'a', 'b', 'strong', 'em', 'i'];
  const dirty = htmlFromMarkdown;
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: allowedTags,
  });

  // Parse the sanitized HTML to React elements
  const returnVal = parseHtmlToReact(clean.toString().trim());
  return returnVal;
};
