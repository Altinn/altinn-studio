import React from 'react';
import { Button, LegacyTextArea, Textfield } from '@digdir/design-system-react';
import { AltinnPopper } from 'app-shared/components/AltinnPopper';
import classes from './MainContent.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

interface IMainContentProps {
  repositoryName: string;
  appDescription: string;
  appId: string;
  appName: string;
  editAppName: boolean;
  onAppDescriptionBlur: () => void;
  onAppDescriptionChange: (event: any) => void;
  onAppIdBlur: () => void;
  onAppIdChange: (event: any) => void;
  onAppNameBlur: () => void;
  onAppNameChange: (event: any) => void;
  onEditAppNameClick: () => void;
  appNameAnchorEl: any;
}

const nameLabelId = 'administrationInputAppNameHeader';
const descriptionLabelId = 'administrationInputAppDescriptionHeader';
const appIdLabelId = 'administrationInputAppIdHeader';

export const MainContent = (props: IMainContentProps): JSX.Element => {
  const [searchParams] = useSearchParams();
  const copiedApp = Boolean(searchParams.get('copiedApp'));
  const { t } = useTranslation();
  return (
    <div className={classes.mainContentContainer}>
      {copiedApp && (
        <>
          <h2>{t('administration.copied_app_header')}</h2>
          <p>
            <Trans i18nKey='administration.copied_app_information'>
              <a target='_blank' rel='noreferrer'>
                brukerdokumentasjon
              </a>
            </Trans>
          </p>
        </>
      )}
      <h2 id={nameLabelId}>{t('general.service_name')}</h2>
      <p>{t('administration.service_name_administration_description')}</p>
      <div className={classes.sideBySide}>
        <Textfield
          aria-labelledby={nameLabelId}
          onChange={props.onAppNameChange}
          value={props.appName}
          onBlur={props.onAppNameBlur}
          disabled={!props.editAppName}
        />
        <Button color='second' onClick={props.onEditAppNameClick} variant='secondary' size='small'>
          {t('general.edit')}
        </Button>
      </div>
      <AltinnPopper
        anchorEl={props.appNameAnchorEl}
        message={t('administration.service_name_empty_message')}
      />
      <h2 id={appIdLabelId}>{t('administration.service_id')}</h2>
      <p>{t('administration.service_id_description')}</p>
      <Textfield
        aria-labelledby={appIdLabelId}
        onChange={props.onAppIdChange}
        value={props.appId}
        onBlur={props.onAppIdBlur}
      />
      <h2>{t('general.service_saved_name')}</h2>
      <p>{t('administration.service_saved_name_administration_description')}</p>
      <Textfield id='administrationInputReponame' value={props.repositoryName} disabled={true} />
      <h2 id={descriptionLabelId}>{t('administration.service_comment')}</h2>
      <p>{t('administration.service_comment_description')}</p>
      <LegacyTextArea
        aria-labelledby={descriptionLabelId}
        onChange={props.onAppDescriptionChange}
        rows={7}
        value={props.appDescription}
        onBlur={props.onAppDescriptionBlur}
      />
    </div>
  );
};
