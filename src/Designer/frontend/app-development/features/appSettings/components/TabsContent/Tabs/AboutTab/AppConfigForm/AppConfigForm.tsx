import React, { useRef, useState } from 'react';
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
import { SwitchInput } from './SwitchInput';
import { mapKeywordsArrayToString, mapStringToKeywords } from '../utils/appConfigKeywordUtils';
import { ContactPoints } from './ContactPoints';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export type AppConfigFormProps = {
  appConfig: ApplicationMetadata;
  saveAppConfig: (appConfig: ApplicationMetadata) => void; // Remove prop when endpoint is implemented
};

export function AppConfigForm({ appConfig, saveAppConfig }: AppConfigFormProps): ReactElement {
  const { t } = useTranslation();
  const [updatedAppConfig, setUpdatedAppConfig] = useState<ApplicationMetadata>(appConfig);
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
      setUpdatedAppConfig(appConfig);
      setKeywordsInputValue(mapKeywordsArrayToString(appConfig.keywords ?? []));
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
    setUpdatedAppConfig((oldVal: ApplicationMetadata) => ({
      ...oldVal,
      visible: e.target.checked,
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
        <SwitchInput
          switchAriaLabel={t('app_settings.about_tab_delegable_show_text', {
            shouldText: !updatedAppConfig.access?.delegable
              ? t('app_settings.about_tab_switch_should_not')
              : '',
          })}
          cardHeading={t('app_settings.about_tab_delegable_field_label')}
          description={t('app_settings.about_tab_delegable_field_description')}
          checked={updatedAppConfig?.access?.delegable ?? false}
          onChange={onChangeDelegable}
        />
        {updatedAppConfig.access?.delegable && (
          <InputfieldsWithTranslation
            label={t('app_settings.about_tab_right_description_field_label')}
            description={t('app_settings.about_tab_right_description_field_description')}
            id={AppResourceFormFieldIds.RightDescription}
            value={updatedAppConfig.access.rightDescription}
            updateLanguage={onChangeRightDescription}
            required
            isTextArea
          />
        )}
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
        <ContactPoints
          contactPointList={updatedAppConfig.contactPoints}
          onContactPointsChanged={onChangeContactPoints}
          id={AppResourceFormFieldIds.ContactPointsId}
        />
        <SwitchInput
          switchAriaLabel={t('app_settings.about_tab_visible_show_text', {
            shouldText: !updatedAppConfig.visible
              ? t('app_settings.about_tab_switch_should_not')
              : '',
          })}
          cardHeading={t('app_settings.about_tab_visible_label')}
          description={t('app_settings.about_tab_visible_description')}
          checked={updatedAppConfig?.visible ?? false}
          onChange={onChangeVisible}
        />
      </div>
      <ActionButtons
        onSave={saveUpdatedAppConfig}
        onReset={resetAppConfig}
        areButtonsDisabled={ObjectUtils.areObjectsEqual(updatedAppConfig, appConfig)}
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
