import React from 'react';
import {
  StudioAlert,
  StudioDialog,
  StudioErrorSummary,
  StudioHeading,
  StudioLink,
  StudioParagraph,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  type AppValidationResult,
  useAppValidationQuery,
} from 'app-development/hooks/queries/useAppValidationQuery';
import { formatDateAndTime } from '../../utils/formatDateAndTime';
import classes from './AppValidationDialog.module.css';
import { type ErrorItem, mapErrorKeyErrorItems } from 'app-shared/utils/appValidationUtils';

export const AppValidationDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: validationResult, dataUpdatedAt: validationUpdatedAt } = useAppValidationQuery(
    org,
    app,
  );
  const { t } = useTranslation();

  return (
    <StudioDialog
      modal={false}
      placement='right'
      data-color-scheme='light'
      closedby='any'
      style={{ zIndex: 10 }}
    >
      <StudioDialog.Block>
        <StudioHeading>{t('app_validation.heading')}</StudioHeading>
        <StudioParagraph>
          {t('general.updatedAt')} {formatDateAndTime(validationUpdatedAt)}
        </StudioParagraph>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <AppValidationErrorSummary validationResult={validationResult} />
      </StudioDialog.Block>
    </StudioDialog>
  );
};

type AppValidationErrorSummaryProps = { validationResult: AppValidationResult | undefined };

const AppValidationErrorSummary = ({ validationResult }: AppValidationErrorSummaryProps) => {
  if (validationResult?.errors) {
    return <AltinnAppServiceResourceValidation validationResult={validationResult} />;
  }
  return null;
};

const AltinnAppServiceResourceValidation = ({
  validationResult,
}: {
  validationResult: AppValidationResult;
}) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleErrorLinkClick = (search: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate({ pathname: `/${org}/${app}/app-settings`, search: `?${search}` });
  };

  const errorKeys = Object.keys(validationResult?.errors || {});

  const errorItems = mapErrorKeyErrorItems(errorKeys, 'danger', org, app, t);
  const warningItems = mapErrorKeyErrorItems(errorKeys, 'warning', org, app, t);

  return (
    <div className={classes.validationAlertsWrapper}>
      {errorItems.length > 0 && (
        <AppValidationAlert
          errorItems={errorItems}
          severity='danger'
          handleErrorLinkClick={handleErrorLinkClick}
          title={t('app_validation.app_metadata.errors')}
          description={t('app_validation.app_metadata.errors_description')}
        />
      )}
      {warningItems.length > 0 && (
        <AppValidationAlert
          errorItems={warningItems}
          severity='warning'
          title={t('app_validation.app_metadata.warnings')}
          description={t('app_validation.app_metadata.warnings_description')}
          handleErrorLinkClick={handleErrorLinkClick}
        />
      )}
    </div>
  );
};

export type AppValidationAlertProps = {
  errorItems: ErrorItem[];
  severity: 'warning' | 'danger';
  title: string;
  description: string;
  handleErrorLinkClick?: (search: string) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

const AppValidationAlert = ({
  errorItems,
  severity,
  title,
  description,
  handleErrorLinkClick,
}: AppValidationAlertProps) => {
  return (
    <StudioAlert data-color={severity}>
      <StudioHeading className={classes.validationHeader}>{title}</StudioHeading>
      <StudioParagraph spacing>{description}</StudioParagraph>
      <StudioErrorSummary.List>
        {errorItems.map(({ errorKey, search, fullHref, errorMessage }) => (
          <StudioErrorSummary.Item key={errorKey}>
            <StudioLink
              className={classes.validationLink}
              href={fullHref}
              onClick={handleErrorLinkClick(search)}
            >
              {errorMessage}
            </StudioLink>
          </StudioErrorSummary.Item>
        ))}
      </StudioErrorSummary.List>
    </StudioAlert>
  );
};
