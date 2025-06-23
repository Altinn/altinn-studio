import React from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'markdown-to-jsx';
import cn from 'classnames';
import {
  StudioAlert,
  StudioButton,
  StudioHeading,
  StudioParagraph,
  StudioSelect,
  StudioSwitch,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import type {
  ConsentMetadata,
  ConsentTemplate,
  SupportedLanguage,
  ValidLanguage,
} from 'app-shared/types/ResourceAdm';
import classes from './ConsentPreview.module.css';
import { ToggleGroup } from '@digdir/designsystemet-react';

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
  template: ConsentTemplate;
  resourceName: SupportedLanguage;
  consentText: SupportedLanguage;
  consentMetadata: ConsentMetadata;
  isOneTimeConsent: boolean;
}

export const ConsentPreview = ({
  template,
  resourceName,
  consentText,
  consentMetadata,
  isOneTimeConsent,
}: ConsentPreviewProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState<ValidLanguage>('nb');
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
        Expiration: new Date().toLocaleDateString('no-NB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
      }
    : {};

  const resourceMetadata = isDummyMetadataEnabled ? getDummyResourceMetadata(consentMetadata) : {};

  const texts = {
    title: replaceMetadata(template.texts.title[reporteeType][language], staticMetadata),
    heading: replaceMetadata(template.texts.heading[reporteeType][language], staticMetadata),
    consentMessage: template.texts.overriddenDelegationContext
      ? replaceMetadata(template.texts.overriddenDelegationContext[language], staticMetadata)
      : 'Denne teksten settes av den som ber om samtykke',
    serviceIntro: replaceMetadata(
      template.texts.serviceIntro[reporteeType][language],
      staticMetadata,
    ),
    resourceText: replaceMetadata(consentText[language], resourceMetadata),
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
        <StudioHeading level={2} data-size='md'>
          {t('resourceadm.about_resource_consent_preview')}
        </StudioHeading>
        <div className={classes.previewControls}>
          <ToggleGroup
            size='sm'
            value={reporteeType}
            onChange={(newValue: string) => setReporteeType(newValue as 'person' | 'org')}
          >
            <ToggleGroup.Item value='person'>
              {t('resourceadm.about_resource_consent_preview_person')}
            </ToggleGroup.Item>
            <ToggleGroup.Item value='org'>
              {t('resourceadm.about_resource_consent_preview_org')}
            </ToggleGroup.Item>
          </ToggleGroup>
          <ToggleGroup
            size='sm'
            value={language}
            onChange={(newValue: string) => setLanguage(newValue as ValidLanguage)}
          >
            <ToggleGroup.Item value='nb'>
              {t('resourceadm.about_resource_consent_preview_language_nb')}
            </ToggleGroup.Item>
            <ToggleGroup.Item value='nn'>
              {t('resourceadm.about_resource_consent_preview_language_nn')}
            </ToggleGroup.Item>
            <ToggleGroup.Item value='en'>
              {t('resourceadm.about_resource_consent_preview_language_en')}
            </ToggleGroup.Item>
          </ToggleGroup>
          <StudioSwitch
            label={t('resourceadm.about_resource_consent_preview_dummy_metadata')}
            checked={isDummyMetadataEnabled}
            onChange={(event) => setIsDummyMetadataEnabled(event.target.checked)}
          />
          <StudioSwitch
            label={t('resourceadm.about_resource_consent_preview_mobile_view')}
            checked={isMobileViewEnabled}
            onChange={(event) => setIsMobileViewEnabled(event.target.checked)}
          />
        </div>
        <div className={isMobileViewEnabled ? classes.mobileView : undefined}>
          <div className={classes.consentBlock}>
            <StudioHeading level={1} data-size='md'>
              {texts.title}
            </StudioHeading>
          </div>
          <div className={classes.consentBlock}>
            <StudioParagraph className={classes.boldText}>{texts.heading}</StudioParagraph>
            <StudioParagraph>{texts.consentMessage}</StudioParagraph>
            <StudioHeading level={2} data-size='2xs'>
              {texts.serviceIntro}
            </StudioHeading>
            <div className={classes.consentRight}>
              <CheckmarkIcon className={classes.consentRightIcon} />
              <div className={classes.consentRightContent}>
                <StudioHeading level={3} data-size='2xs'>
                  {resourceName[language]}
                </StudioHeading>
                <Markdown>{texts.resourceText}</Markdown>
              </div>
            </div>
            <StudioParagraph className={cn(classes.expiration, classes.boldText)}>
              {texts.expiration}
            </StudioParagraph>
            <StudioParagraph>{texts.handledBy}</StudioParagraph>
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
    return acc.replace(`{${metadataKey}}`, metadata[metadataKey]);
  }, consentText);
};

const getDummyResourceMetadata = (consentMetadata: ConsentMetadata) => {
  const getRandomString = () => Math.random().toString(36).substring(2, 10);
  return Object.keys(consentMetadata).reduce((acc, key) => {
    if (key.toLowerCase().indexOf('aar') > -1 || key.toLowerCase().indexOf('year') > -1) {
      acc[key] = '2025';
    } else if (key.toLowerCase().indexOf('dato') > -1 || key.toLowerCase().indexOf('date') > -1) {
      acc[key] = '01.07.2025';
    } else {
      acc[key] = getRandomString();
    }
    return acc;
  }, {});
};
