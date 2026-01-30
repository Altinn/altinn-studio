import React from 'react';
import {
  StudioDialog,
  StudioErrorSummary,
  StudioHeading,
  StudioLink,
  StudioParagraph,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useAppValidationQuery } from 'app-development/hooks/queries/useAppValidationQuery';

export const AppValidationDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: validationResult, dataUpdatedAt: validationUpdatedAt } = useAppValidationQuery(
    org,
    app,
  );

  return (
    <StudioDialog
      modal={false}
      placement='right'
      data-color-scheme='light'
      closedby='any'
      style={{ zIndex: 10 }}
    >
      <StudioDialog.Block>
        <StudioHeading>Valideringsfeil</StudioHeading>
        <StudioParagraph>
          Oppdatert {new Date(validationUpdatedAt).toLocaleString()}
        </StudioParagraph>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <AppValidationErrorSummary validationResult={validationResult} />
      </StudioDialog.Block>
    </StudioDialog>
  );
};

type AppValidationErrorSummaryProps = { validationResult: any };

const AppValidationErrorSummary = ({ validationResult }: AppValidationErrorSummaryProps) => {
  if (validationResult?.errors) {
    return <AltinnAppServiceResourceValidation validationResult={validationResult} />;
  }
  return null;
};

const AltinnAppServiceResourceValidation = ({ validationResult }: { validationResult: any }) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const errorKeys = Object.keys(validationResult.errors);

  return (
    <StudioErrorSummary>
      <StudioErrorSummary.Heading>
        {t('app_validation.app_metadata.errors_need_fixing')}
      </StudioErrorSummary.Heading>
      <StudioErrorSummary.List>
        {errorKeys.map((errorKey) => {
          const fieldConfig = getFieldConfig(errorKey);
          const anchor = fieldConfig?.anchor ?? '';
          const navigationLink = `/editor/${org}/${app}/app-settings?currentTab=about#${anchor}`;
          const errorMessage = t(fieldConfig?.translationKey ?? errorKey);

          return (
            <StudioErrorSummary.Item key={errorKey}>
              <StudioLink href={navigationLink}>{errorMessage}</StudioLink>
            </StudioErrorSummary.Item>
          );
        })}
      </StudioErrorSummary.List>
    </StudioErrorSummary>
  );
};

const getFieldConfig = (errorKey: string): FieldConfig | undefined => {
  if (VALIDATION_FIELD_CONFIG[errorKey]) {
    return VALIDATION_FIELD_CONFIG[errorKey];
  }

  const contactPointMatch = errorKey.match(/^contactPoints\[(\d+)\]$/);
  if (contactPointMatch) {
    const index = contactPointMatch[1];
    return {
      anchor: `contactPoints-${index}`,
      translationKey: 'app_validation.app_metadata.contact_points.incomplete',
    };
  }

  return undefined;
};

type FieldConfig = {
  anchor: string;
  translationKey: string;
};

const VALIDATION_FIELD_CONFIG: Record<string, FieldConfig> = {
  identifier: {
    anchor: 'identifier',
    translationKey: 'app_validation.app_metadata.identifier.required',
  },
  serviceName: {
    anchor: 'serviceName-nb',
    translationKey: 'app_validation.app_metadata.title.required',
  },
  'serviceName.nb': {
    anchor: 'serviceName-nb',
    translationKey: 'app_validation.app_metadata.title.nb.required',
  },
  'serviceName.nn': {
    anchor: 'serviceName-nn',
    translationKey: 'app_validation.app_metadata.title.nn.required',
  },
  'serviceName.en': {
    anchor: 'serviceName-en',
    translationKey: 'app_validation.app_metadata.title.en.required',
  },
  description: {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.required',
  },
  'description.nb': {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.nb.required',
  },
  'description.nn': {
    anchor: 'description-nn',
    translationKey: 'app_validation.app_metadata.description.nn.required',
  },
  'description.en': {
    anchor: 'description-en',
    translationKey: 'app_validation.app_metadata.description.en.required',
  },
  'access.rightDescription': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.required',
  },
  'access.rightDescription.nb': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.nb.required',
  },
  'access.rightDescription.nn': {
    anchor: 'rightDescription-nn',
    translationKey: 'app_validation.app_metadata.right_description.nn.required',
  },
  'access.rightDescription.en': {
    anchor: 'rightDescription-en',
    translationKey: 'app_validation.app_metadata.right_description.en.required',
  },
  contactPoints: {
    anchor: 'contactPoints-0',
    translationKey: 'app_validation.app_metadata.contact_points.required',
  },
};
