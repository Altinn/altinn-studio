import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './AppVisibilityAndDelegationCard.module.css';
import { StudioCard, StudioParagraph, StudioSwitch } from '@studio/components';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import { InputfieldsWithTranslation } from '../InputfieldsWithTranslation';
import { InformationSquareFillIcon } from '@studio/icons';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

const DESCRIPTION_ID = 'rightDescription';

enum VisibilityStatus {
  HiddenNonDelegable = 'hidden-nondelegable',
  Visible = 'visible',
  HiddenDelegable = 'hidden-delegable',
}

export type AppVisibilityAndDelegationCardProps = {
  visible: boolean;
  delegable: boolean;
  descriptionValue: SupportedLanguage;
  onChangeVisible?: (event: ChangeEvent<HTMLInputElement>) => void;
  onChangeDelegable?: (event: ChangeEvent<HTMLInputElement>) => void;
  onChangeDescription?: (value: SupportedLanguage) => void;
};

export function AppVisibilityAndDelegationCard({
  visible,
  delegable,
  descriptionValue,
  onChangeVisible,
  onChangeDelegable,
  onChangeDescription,
}: AppVisibilityAndDelegationCardProps): ReactElement {
  const { t } = useTranslation();

  const cardTitle = t('app_settings.about_tab_visibility_and_delegation_title');
  const visibleLabel = t('app_settings.about_tab_visibility_and_delegation_visible_label');
  const delegableLabel = t('app_settings.about_tab_visibility_and_delegation_delegable_label');
  const descriptionLabel = t('app_settings.about_tab_visibility_and_delegation_description_label');
  const descriptionText = t('app_settings.about_tab_visibility_and_delegation_description_text');

  const infoHiddenNoDelegation = t(
    'app_settings.about_tab_visibility_and_delegation_info_hidden_no_delegation',
  );
  const infoVisibleCanDelegate = t(
    'app_settings.about_tab_visibility_and_delegation_info_visible_can_delegate',
  );
  const warningHiddenDelegateViaApi = t(
    'app_settings.about_tab_visibility_and_delegation_warning_hidden_delegate_via_api',
  );

  const status = getStatus(visible, delegable);
  const infoText = getInfoText(status, infoHiddenNoDelegation, infoVisibleCanDelegate);

  const warningText =
    status === VisibilityStatus.HiddenDelegable ? warningHiddenDelegateViaApi : null;

  const showDescriptionSection = visible || delegable;

  return (
    <StudioCard>
      <StudioParagraph className={classes.title}>{cardTitle}</StudioParagraph>

      <div className={classes.switchRow}>
        <StudioParagraph>{visibleLabel}</StudioParagraph>
        <StudioSwitch checked={visible} onChange={onChangeVisible} aria-label={visibleLabel} />
      </div>

      <div className={cn(classes.switchRow, { [classes.switchRowDisabled]: visible })}>
        <StudioParagraph className={classes.switchLabel}>{delegableLabel}</StudioParagraph>
        <StudioSwitch
          checked={delegable}
          onChange={onChangeDelegable}
          aria-label={delegableLabel}
          disabled={visible}
        />
      </div>

      {infoText && (
        <div className={classes.message}>
          <InformationSquareFillIcon className={classes.infoIcon} aria-hidden />
          <StudioParagraph className={classes.messageTextInfo}>{infoText}</StudioParagraph>
        </div>
      )}

      {warningText && (
        <div className={cn(classes.message, classes.messageWarning)}>
          <ExclamationmarkTriangleIcon className={classes.warningIcon} title={warningText} />
          <StudioParagraph>{warningText}</StudioParagraph>
        </div>
      )}

      {showDescriptionSection && (
        <div className={classes.descriptionContainer}>
          <InputfieldsWithTranslation
            id={DESCRIPTION_ID}
            label={descriptionLabel}
            description={descriptionText}
            value={descriptionValue}
            updateLanguage={onChangeDescription}
            required
            isTextArea
          />
        </div>
      )}
    </StudioCard>
  );
}

const getStatus = (visible: boolean, delegable: boolean): VisibilityStatus => {
  if (!visible && !delegable) return VisibilityStatus.HiddenNonDelegable;
  if (visible) return VisibilityStatus.Visible;
  return VisibilityStatus.HiddenDelegable;
};

const getInfoText = (
  status: VisibilityStatus,
  infoHiddenNoDelegation: string,
  infoVisibleCanDelegate: string,
): string | null => {
  if (status === VisibilityStatus.HiddenNonDelegable) return infoHiddenNoDelegation;
  if (status === VisibilityStatus.Visible) return infoVisibleCanDelegate;
  return null;
};
