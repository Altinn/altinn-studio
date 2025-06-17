import React from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioHeading,
  StudioParagraph,
  StudioSelect,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import type {
  ConsentTemplate,
  SupportedLanguage,
  ValidLanguage,
} from 'app-shared/types/ResourceAdm';
import classes from './ConsentPreview.module.css';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

interface ConsentPreviewProps {
  consentTemplate: ConsentTemplate;
  resourceName: SupportedLanguage;
  consentText: SupportedLanguage;
  isOneTimeConsent: boolean;
}

export const ConsentPreview = ({
  consentTemplate,
  resourceName,
  consentText,
  isOneTimeConsent,
}: ConsentPreviewProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState<ValidLanguage>('nb');
  const [reporteeType, setReporteeType] = React.useState<'person' | 'org'>('person');

  const buttonTexts = {
    nb: {
      approve: t('resourceadm.about_resource_consent_preview_approve_nb'),
      reject: t('resourceadm.about_resource_consent_preview_reject_nb'),
      approve_poa: t('resourceadm.about_resource_consent_preview_approve_poa_nb'),
      reject_poa: t('resourceadm.about_resource_consent_preview_reject_poa_nb'),
    },
    nn: {
      approve: t('resourceadm.about_resource_consent_preview_approve_nn'),
      reject: t('resourceadm.about_resource_consent_preview_reject_nn'),
      approve_poa: t('resourceadm.about_resource_consent_preview_approve_poa_nn'),
      reject_poa: t('resourceadm.about_resource_consent_preview_reject_poa_nn'),
    },
    en: {
      approve: t('resourceadm.about_resource_consent_preview_approve_en'),
      reject: t('resourceadm.about_resource_consent_preview_reject_en'),
      approve_poa: t('resourceadm.about_resource_consent_preview_approve_poa_en'),
      reject_poa: t('resourceadm.about_resource_consent_preview_reject_poa_en'),
    },
  };

  if (!consentTemplate) {
    return (
      <StudioAlert data-color='danger'>
        {t('resourceadm.about_resource_consent_preview_no_template')}
      </StudioAlert>
    );
  }

  return (
    <div className={classes.consentPreviewPanel}>
      <div className={classes.consentPreviewInner}>
        <StudioHeading level={2} data-size='md'>
          {t('resourceadm.about_resource_consent_preview')}
        </StudioHeading>
        <div className={classes.previewControls}>
          <StudioSelect
            label={t('resourceadm.about_resource_consent_preview_reportee')}
            value={reporteeType}
            onChange={(event) => setReporteeType(event.target.value as 'person' | 'org')}
          >
            <StudioSelect.Option value='person'>
              {t('resourceadm.about_resource_consent_preview_person')}
            </StudioSelect.Option>
            <StudioSelect.Option value='org'>
              {t('resourceadm.about_resource_consent_preview_org')}
            </StudioSelect.Option>
          </StudioSelect>
          <StudioSelect
            label={t('resourceadm.about_resource_consent_preview_language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value as ValidLanguage)}
          >
            <StudioSelect.Option value='nb'>
              {t('resourceadm.about_resource_consent_preview_language_nb')}
            </StudioSelect.Option>
            <StudioSelect.Option value='nn'>
              {t('resourceadm.about_resource_consent_preview_language_nn')}
            </StudioSelect.Option>
            <StudioSelect.Option value='en'>
              {t('resourceadm.about_resource_consent_preview_language_en')}
            </StudioSelect.Option>
          </StudioSelect>
        </div>
        <div>
          <div className={classes.consentBlock}>
            <StudioHeading level={1} data-size='md'>
              {consentTemplate.texts.title[reporteeType][language]}
            </StudioHeading>
          </div>
          <div className={classes.consentBlock}>
            <StudioParagraph>
              {consentTemplate.texts.heading[reporteeType][language]}
            </StudioParagraph>
            <StudioParagraph>
              {consentTemplate.texts.overriddenDelegationContext
                ? consentTemplate.texts.overriddenDelegationContext[language]
                : 'Denne teksten settes av banken'}
            </StudioParagraph>
            <StudioHeading level={2} data-size='2xs'>
              {consentTemplate.texts.serviceIntro[reporteeType][language]}
            </StudioHeading>
            <div>
              <div className={classes.consentRight}>
                <CheckmarkIcon className={classes.consentRightIcon} />
                <div>
                  <StudioHeading level={2} data-size='2xs'>
                    {resourceName[language]}
                  </StudioHeading>
                  <Markdown>{consentText[language]}</Markdown>
                </div>
              </div>
            </div>
            <StudioParagraph className={classes.expiration}>
              {isOneTimeConsent
                ? consentTemplate.texts.expirationOneTime[language]
                : consentTemplate.texts.expiration[language]}
            </StudioParagraph>
            {consentTemplate.texts.handledBy && (
              <StudioParagraph>{consentTemplate.texts.handledBy[language]}</StudioParagraph>
            )}
            <div className={classes.buttonRow}>
              <StudioButton variant='primary' tabIndex={-1}>
                {consentTemplate.isPoa
                  ? buttonTexts[language].approve_poa
                  : buttonTexts[language].approve}
              </StudioButton>
              <StudioButton variant='tertiary' tabIndex={-1}>
                {consentTemplate.isPoa
                  ? buttonTexts[language].reject_poa
                  : buttonTexts[language].reject}
              </StudioButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
