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

  const errorMembers = Object.entries(validationResult.errors);

  return (
    <StudioErrorSummary>
      <StudioErrorSummary.Heading>
        For å kunne publisere appen til ressursregisteret må disse feilene rettes:
      </StudioErrorSummary.Heading>
      <StudioErrorSummary.List>
        {errorMembers.map(([key, _value]) => {
          const navigationBase = `/editor/${org}/${app}/app-settings?currentTab=about`;
          const navigationSuffix = ALTINNAPP_VALIDATION_ERROR_FIELD_MAP[key]?.navigationAnchor
            ? `#${ALTINNAPP_VALIDATION_ERROR_FIELD_MAP[key].navigationAnchor}`
            : '';
          const navigationLink = `${navigationBase}${navigationSuffix}`;
          const errorDetails = t(ALTINNAPP_VALIDATION_ERROR_FIELD_MAP[key]?.errorName) || key;

          return (
            <StudioErrorSummary.Item key={key}>
              <StudioLink href={navigationLink}>{errorDetails}</StudioLink>
            </StudioErrorSummary.Item>
          );
        })}
      </StudioErrorSummary.List>
    </StudioErrorSummary>
  );
};

const ALTINNAPP_VALIDATION_ERROR_FIELD_MAP: {
  [key: string]: { navigationAnchor: string; errorName: string };
} = {
  Title: {
    navigationAnchor: 'serviceName-nb',
    errorName: 'app_validation.app_metadata.title.required',
  },
  'Title.Nb': {
    navigationAnchor: 'serviceName-nb',
    errorName: 'app_validation.app_metadata.title.nb.required',
  },
  'Title.En': {
    navigationAnchor: 'serviceName-en',
    errorName: 'app_validation.app_metadata.title.en.required',
  },
  'Title.Nn': {
    navigationAnchor: 'serviceName-nn',
    errorName: 'app_validation.app_metadata.title.nn.required',
  },
  ContactPoints: {
    navigationAnchor: 'contactPoints-0',
    errorName: 'app_validation.app_metadata.contact_points.required',
  },
  Description: {
    navigationAnchor: 'description-nb',
    errorName: 'app_validation.app_metadata.description.required',
  },
  'Description.Nb': {
    navigationAnchor: 'description-nb',
    errorName: 'app_validation.app_metadata.description.nb.required',
  },
  'Description.En': {
    navigationAnchor: 'description-en',
    errorName: 'app_validation.app_metadata.description.en.required',
  },
  'Description.Nn': {
    navigationAnchor: 'description-nn',
    errorName: 'app_validation.app_metadata.description.nn.required',
  },
  RightDescription: {
    navigationAnchor: 'rightDescription-nb',
    errorName: 'app_validation.app_metadata.right_description.required',
  },
  'RightDescription.Nb': {
    navigationAnchor: 'rightDescription-nb',
    errorName: 'app_validation.app_metadata.right_description.nb.required',
  },
  'RightDescription.En': {
    navigationAnchor: 'rightDescription-en',
    errorName: 'app_validation.app_metadata.right_description.en.required',
  },
  'RightDescription.Nn': {
    navigationAnchor: 'rightDescription-nn',
    errorName: 'app_validation.app_metadata.right_description.nn.required',
  },
};
