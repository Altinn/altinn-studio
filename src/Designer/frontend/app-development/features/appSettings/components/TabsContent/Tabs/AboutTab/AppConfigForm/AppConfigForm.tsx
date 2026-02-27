import React, { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MutableRefObject, ReactElement } from 'react';
import classes from './AppConfigForm.module.css';
import { useTranslation } from 'react-i18next';
import { StudioTextfield, StudioInlineTextField } from '@studio/components';
import type { ContactPoint, Keyword } from 'app-shared/types/AppConfig';
import { ActionButtons } from './ActionButtons';
import { InputfieldsWithTranslation } from './InputfieldsWithTranslation';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import { ObjectUtils } from '@studio/pure-functions';
import { AppVisibilityAndDelegationCard } from './AppVisibilityAndDelegationCard';
import { mapKeywordsArrayToString, mapStringToKeywords } from '../utils/appConfigKeywordUtils';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { ContactPointsTable } from './ContactPointsTable/ContactPointsTable';

export type AppConfigFormProps = {
  appConfig: ApplicationMetadata;
  saveAppConfig: (appConfig: ApplicationMetadata) => void; // Remove prop when endpoint is implemented
};

export function AppConfigForm({ appConfig, saveAppConfig }: AppConfigFormProps): ReactElement {
  const { t } = useTranslation();
  const appConfigWithDefaults: ApplicationMetadata = useMemo(
    () => ({
      ...appConfig,
      visible: appConfig.visible ?? true,
      access: { ...appConfig.access, delegable: appConfig.access?.delegable ?? true },
    }),
    [appConfig],
  );

  const defaultDescriptionValue = { nb: '', nn: '', en: '' };

  const [updatedAppConfig, setUpdatedAppConfig] =
    useState<ApplicationMetadata>(appConfigWithDefaults);
  const [showAppConfigErrors, setShowAppConfigErrors] = useState<boolean>(false);
  const [keywordsInputValue, setKeywordsInputValue] = useState(
    mapKeywordsArrayToString(updatedAppConfig.keywords ?? []),
  );

  const errorSummaryRef: MutableRefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(
    null,
  );

  useScrollIntoView(showAppConfigErrors, errorSummaryRef);

  const saveUpdatedAppConfig = (): void => {
    setShowAppConfigErrors(false);
    persistAppDetails();
  };

  const persistAppDetails = (): void => {
    setShowAppConfigErrors(false);
    saveAppConfig({ ...updatedAppConfig });
  };

  const resetAppConfig = (): void => {
    if (confirm(t('app_settings.about_tab_reset_confirmation'))) {
      setUpdatedAppConfig(appConfigWithDefaults);
      setKeywordsInputValue(mapKeywordsArrayToString(appConfigWithDefaults.keywords ?? []));
      setShowAppConfigErrors(false);
    }
  };

  const onChangeTitle = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      title: updatedLanguage,
    }));
  };

  const onChangeDescription = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      description: updatedLanguage,
    }));
  };

  const onChangeHomepage = (newValue: string): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      homepage: newValue,
    }));
  };

  const onChangeDelegable = (e: ChangeEvent<HTMLInputElement>): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      access: {
        ...oldVal.access,
        delegable: e.target.checked,
      },
    }));
  };

  const onChangeRightDescription = (updatedLanguage: SupportedLanguage): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      access: {
        ...oldVal.access,
        rightDescription: updatedLanguage,
      },
    }));
  };

  const onChangeKeywords = (newValue: string): void => {
    setKeywordsInputValue(newValue);

    const keywords: Keyword[] = mapStringToKeywords(newValue);
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      keywords,
    }));
  };

  const onChangeContactPoints = (contactPoints: ContactPoint[]): void => {
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      contactPoints,
    }));
  };

  const onChangeVisible = (e: ChangeEvent<HTMLInputElement>): void => {
    const isVisible = e.target.checked;
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      visible: isVisible,
      access: { ...oldVal.access, ...(isVisible ? { delegable: true } : {}) },
    }));
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.formWrapper}>
        <StudioTextfield
          label={t('app_settings.about_tab_repo_label')}
          description={t('app_settings.about_tab_repo_description')}
          defaultValue={updatedAppConfig.id}
          readOnly
        />
        <InputfieldsWithTranslation
          label={t('app_settings.about_tab_name_label')}
          description={t('app_settings.about_tab_name_description')}
          id={AppResourceFormFieldIds.Title}
          value={updatedAppConfig.title}
          updateLanguage={onChangeTitle}
          required
        />
        <InputfieldsWithTranslation
          label={t('app_settings.about_tab_description_field_label')}
          description={t('app_settings.about_tab_description_field_description')}
          id={AppResourceFormFieldIds.Description}
          value={updatedAppConfig.description}
          updateLanguage={onChangeDescription}
          required
          isTextArea
        />
        <StudioInlineTextField
          label={t('app_settings.about_tab_homepage_field_label')}
          description={t('app_settings.about_tab_homepage_field_description')}
          value={updatedAppConfig.homepage ?? ''}
          onChange={onChangeHomepage}
          required={false}
          tagText={t('general.optional')}
          saveAriaLabel={t('general.save')}
          cancelAriaLabel={t('general.cancel')}
        />
        <AppVisibilityAndDelegationCard
          visible={updatedAppConfig.visible ?? false}
          delegable={updatedAppConfig.access?.delegable ?? false}
          descriptionValue={updatedAppConfig.access?.rightDescription ?? defaultDescriptionValue}
          onChangeVisible={onChangeVisible}
          onChangeDelegable={onChangeDelegable}
          onChangeDescription={onChangeRightDescription}
        />
        <StudioInlineTextField
          label={t('app_settings.about_tab_keywords_label')}
          description={t('app_settings.about_tab_keywords_description')}
          value={keywordsInputValue}
          onChange={onChangeKeywords}
          required={false}
          tagText={t('general.optional')}
          saveAriaLabel={t('general.save')}
          cancelAriaLabel={t('general.cancel')}
        />
        <ContactPointsTable
          contactPointList={updatedAppConfig.contactPoints}
          onContactPointsChanged={onChangeContactPoints}
          id={AppResourceFormFieldIds.ContactPointsId}
        />
      </div>
      <ActionButtons
        onSave={saveUpdatedAppConfig}
        onReset={resetAppConfig}
        areButtonsDisabled={ObjectUtils.areObjectsEqual(updatedAppConfig, appConfigWithDefaults)}
      />
    </div>
  );
}

enum AppResourceFormFieldIds {
  Title = 'title',
  Description = 'description',
  RightDescription = 'rightDescription',
  Status = 'status',
  AvailableForType = 'availableForType',
  ContactPointsId = 'contactPoints',
}
