import React from 'react';
import {
  StudioAlert,
  StudioBadge,
  StudioDetails,
  StudioDialog,
  StudioErrorSummary,
  StudioHeading,
  StudioLink,
  StudioParagraph,
  StudioTag,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppValidationQuery } from 'app-development/hooks/queries/useAppValidationQuery';
import { appValidationAreaId } from '@studio/testing/testids';
import { formatDateAndTime } from '../../utils/formatDateAndTime';
import classes from './AppValidationDialog.module.css';
import {
  type AppValidationAreaGroup,
  type ErrorItem,
  type Severity,
  getAppValidationSummary,
  SEVERITY_TEXT_KEYS,
} from 'app-shared/utils/appValidationUtils';

type ErrorLinkClickHandler = (
  search: string,
) => (event: React.MouseEvent<HTMLAnchorElement>) => void;

export const AppValidationDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: validationResult, dataUpdatedAt: validationUpdatedAt } = useAppValidationQuery(
    org,
    app,
  );
  const { t } = useTranslation();
  const navigate = useNavigate();

  const errorKeys = Object.keys(validationResult?.errors ?? {});
  const { errorItems, warningItems, areaGroups } = getAppValidationSummary(errorKeys, org, app, t);

  const handleErrorLinkClick: ErrorLinkClickHandler = (search) => (event) => {
    event.preventDefault();
    navigate({ pathname: `/${org}/${app}/app-settings`, search: `?${search}` });
  };

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
        <div className={classes.countTags}>
          <ValidationCountTag severity='danger' count={errorItems.length} />
          <ValidationCountTag severity='warning' count={warningItems.length} />
        </div>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.areaList}>
        {areaGroups.length === 0 ? (
          <StudioParagraph>{t('app_validation.no_issues')}</StudioParagraph>
        ) : (
          areaGroups.map((areaGroup) => (
            <AppValidationArea
              key={areaGroup.area}
              areaGroup={areaGroup}
              handleErrorLinkClick={handleErrorLinkClick}
            />
          ))
        )}
      </StudioDialog.Block>
    </StudioDialog>
  );
};

type ValidationCountProps = { severity: Severity; count: number };

const ValidationCountTag = ({ severity, count }: ValidationCountProps) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <StudioTag data-color={severity} data-size='sm' className={classes.countTag}>
      <StudioBadge data-color={severity} count={count} />
      {t(SEVERITY_TEXT_KEYS[severity].label)}
    </StudioTag>
  );
};

const AreaCountBadge = ({ severity, count }: ValidationCountProps) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <StudioBadge
      data-color={severity}
      count={count}
      aria-label={t(SEVERITY_TEXT_KEYS[severity].count, { count })}
      role='img'
    />
  );
};

type AppValidationAreaProps = {
  areaGroup: AppValidationAreaGroup;
  handleErrorLinkClick: ErrorLinkClickHandler;
};

const AppValidationArea = ({ areaGroup, handleErrorLinkClick }: AppValidationAreaProps) => {
  const { t } = useTranslation();
  const { area, areaNameKey, errorItems, warningItems } = areaGroup;

  return (
    <StudioDetails defaultOpen data-testid={appValidationAreaId(area)}>
      <StudioDetails.Summary>
        <span className={classes.areaSummary}>
          {t(areaNameKey)}
          <AreaCountBadge severity='danger' count={errorItems.length} />
          <AreaCountBadge severity='warning' count={warningItems.length} />
        </span>
      </StudioDetails.Summary>
      <StudioDetails.Content>
        <div className={classes.validationAlertsWrapper}>
          {errorItems.length > 0 && (
            <AppValidationAlert
              errorItems={errorItems}
              severity='danger'
              handleErrorLinkClick={handleErrorLinkClick}
            />
          )}
          {warningItems.length > 0 && (
            <AppValidationAlert
              errorItems={warningItems}
              severity='warning'
              handleErrorLinkClick={handleErrorLinkClick}
            />
          )}
        </div>
      </StudioDetails.Content>
    </StudioDetails>
  );
};

export type AppValidationAlertProps = {
  errorItems: ErrorItem[];
  severity: Severity;
  handleErrorLinkClick: ErrorLinkClickHandler;
};

const AppValidationAlert = ({
  errorItems,
  severity,
  handleErrorLinkClick,
}: AppValidationAlertProps) => {
  const { t } = useTranslation();

  return (
    <StudioAlert data-color={severity}>
      <StudioHeading className={classes.validationHeader}>
        {t(SEVERITY_TEXT_KEYS[severity].alertTitle)}
      </StudioHeading>
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
