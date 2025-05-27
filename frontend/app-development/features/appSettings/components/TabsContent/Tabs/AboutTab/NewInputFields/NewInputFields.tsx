import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './NewInputFields.module.css';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import type { AppResource, AppResourceFormError } from 'app-shared/types/AppResource';
import { ActionButtons } from './ActionButtons';
import { LanguageTextField } from './LanguageTextfield/LanguageTextfield';
import type { Translation } from 'app-development/features/appSettings/types/Translation';
import type { SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { validateAppResource } from '../utils/appResourceValidationUtils';
import { useBlocker } from 'react-router-dom';
import { getCurrentSettingsTab } from 'app-development/features/appSettings/utils';

// TODO - Take in prop to say that user has changed tab
type NewInputFieldsProps = {
  appResource: AppResource;
};

export function NewInputFields({ appResource }: NewInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const [translationType, setTranslationType] = useState<Translation>('none');
  const [updatedAppResource, setUpdatedAppResource] = useState<AppResource>(appResource);
  const [showAppResourceErrors, setShowAppResourceErrors] = useState<boolean>(false);

  const validationErrors: AppResourceFormError[] = validateAppResource(appResource, t);

  const showNavigationModal: boolean = useBeforeUnload(updatedAppResource !== appResource);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    console.log('currentLocation', currentLocation);
    console.log('nextLocation', nextLocation);
    const appResourceChanged = updatedAppResource !== appResource;
    const pathnamechanged = currentLocation.pathname !== nextLocation.pathname;
    const nextTabIsDifferentFromCurrentTab = !nextLocation.search.includes(getCurrentSettingsTab());
    console.log('nextTabIsDifferentFromCurrentTab', nextTabIsDifferentFromCurrentTab);

    return appResourceChanged && (pathnamechanged || nextTabIsDifferentFromCurrentTab);
  });

  //   console.log('blocker.state', blocker.state);

  const saveAppConfig = () => {
    if (validationErrors.length === 0) {
      setShowAppResourceErrors(false);
      console.log('AppResource saved: ', updatedAppResource);
    } else {
      setShowAppResourceErrors(true);
      window.scrollTo(0, 0);
      console.error('Validation errors:', validationErrors);
      // Show some message about that errors need to be fixed
    }
  };

  const resetAppConfig = () => {
    if (confirm('test')) {
      // TODO - alert user about unsaved changes being lost
      setUpdatedAppResource(appResource);
    }
  };

  const showServiceNameFields = (): void => setTranslationType('serviceName');
  const hideTranslationFields = (): void => setTranslationType('none');

  return (
    <div className={classes.wrapper}>
      <StudioDialog open={blocker.state === 'blocked'}>
        <StudioDialog.Block>
          <StudioHeading level={2}>{t('app_settings.about_tab_navigation_header')}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioParagraph>{t('')}</StudioParagraph>
          <StudioButton
            variant='primary'
            onClick={() => {
              blocker.proceed();
            }}
          >
            {t('')}
          </StudioButton>
          <StudioButton
            variant='primary'
            onClick={() => {
              blocker.reset();
            }}
          >
            {t('')}
          </StudioButton>
        </StudioDialog.Block>
      </StudioDialog>
      {/* TODO - Add ErrorSummary component here */}
      <StudioTextfield
        label={t('app_settings.about_tab_repo_label')}
        description={t('app_settings.about_tab_repo_description')}
        defaultValue={updatedAppResource.repositoryName}
        className={classes.textField}
        readOnly
      />
      <LanguageTextField
        label={t('app_settings.about_tab_name_label')}
        id={InputFieldIds.ServiceName}
        value={updatedAppResource.serviceName}
        onChange={(updatedLanguage: SupportedLanguage) => {
          setUpdatedAppResource((oldVal: AppResource) => ({
            ...oldVal,
            serviceName: updatedLanguage,
          }));
        }}
        onFocus={showServiceNameFields}
        isTranslationPanelOpen={translationType === 'serviceName'}
        errors={
          showAppResourceErrors
            ? validationErrors.filter((error) => error.field === 'serviceName')
            : []
        }
        required
      />
      <StudioTextfield
        label={t('app_settings.about_tab_alt_id_label')}
        description={t('app_settings.about_tab_alt_id_description')}
        value={updatedAppResource.serviceId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setUpdatedAppResource((oldVal: AppResource) => ({
            ...oldVal,
            serviceId: e.target.value,
          }));
        }}
        onFocus={hideTranslationFields}
        className={classes.textField}
        required={false}
        tagText={t('general.optional')}
      />
      <ActionButtons onSave={saveAppConfig} onReset={resetAppConfig} areButtonsDisabled={false} />
    </div>
  );
}

enum InputFieldIds {
  ServiceName = 'serviceName',
}

export const useBeforeUnload = (shouldWarn: boolean) => {
  const [shouldShowWarning, setShoudShowWarning] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();

        setShoudShowWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);

  return shouldShowWarning;
};
