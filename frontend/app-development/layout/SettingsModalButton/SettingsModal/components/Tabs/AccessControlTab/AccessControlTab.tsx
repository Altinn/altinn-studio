import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import classes from './AccessControlTab.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { ErrorMessage, HelpText, Link, Paragraph } from '@digdir/design-system-react';
import type { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { getPartyTypesAllowedOptions } from '../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { TabContent } from '../../TabContent';
import { AccessControlWarningModal } from './AccessControWarningModal';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';

export type AccessControlTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the access control for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AccessControlTab = ({ org, app }: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDialogElement>(null);

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleAllowedPartyTypeChange = (
    currentPartyTypesAllowed: PartyTypesAllowed,
    checkboxValue: string,
  ) => {
    const updatedPartyTypesAllowed = { ...currentPartyTypesAllowed };
    updatedPartyTypesAllowed[checkboxValue] = !currentPartyTypesAllowed[checkboxValue];

    const updatedCheckedCheckboxes = Object.values(updatedPartyTypesAllowed).filter(
      (value) => value,
    );

    if (updatedCheckedCheckboxes.length === 0) {
      modalRef.current?.showModal();
      return;
    }
    updateAppMetadataMutation({
      ...appMetadata,
      partyTypesAllowed: updatedPartyTypesAllowed,
    });
  };

  const handleTableHeaderCheckboxChange = () => {
    const updatedPartyTypesAllowed = appMetadata.partyTypesAllowed;
    Object.keys(appMetadata.partyTypesAllowed).forEach((key) => {
      updatedPartyTypesAllowed[key] = true;
    });
    updateAppMetadataMutation({
      ...appMetadata,
      partyTypesAllowed: updatedPartyTypesAllowed,
    });
  };

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        const isNoCheckboxesChecked = Object.values(appMetadata.partyTypesAllowed).every(
          (value) => !value,
        );
        const areAllCheckboxesChecked = Object.values(appMetadata.partyTypesAllowed).every(
          (value) => value,
        );
        const isSomeCheckboxesChecked = Object.values(appMetadata.partyTypesAllowed).some(
          (value) => value,
        );
        return (
          <>
            <TabHeader text={t('settings_modal.access_control_tab_checkbox_legend_label')} />
            <Paragraph size='medium'>
              <span>{t('settings_modal.access_control_tab_checkbox_description')}</span>
            </Paragraph>
            <SelectAllowedPartyTypes
              t={t}
              appMetadata={appMetadata}
              isAllChecked={areAllCheckboxesChecked}
              isSomeChecked={isSomeCheckboxesChecked}
              isNoneChecked={isNoCheckboxesChecked}
              handleTableHeaderCheckboxChange={handleTableHeaderCheckboxChange}
              handleAllowedPartyTypeChange={handleAllowedPartyTypeChange}
              getPartyTypesAllowedOptions={getPartyTypesAllowedOptions}
            />
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <div className={classes.tabHeaderContent}>
        <TabHeader text={t('settings_modal.access_control_tab_heading')} />
        <HelpText title={t('settings_modal.access_control_tab_help_text_title')} placement='top'>
          {t('settings_modal.access_control_tab_help_text_heading')}
        </HelpText>
      </div>
      {displayContent()}
      <span className={classes.docsLinkText}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link_text')}
      </span>
      <Trans i18nKey={'settings_modal.access_control_tab_option_access_control_docs_link'}>
        <Link>documentation</Link>
      </Trans>
      <AccessControlWarningModal t={t} modalRef={modalRef} />
    </TabContent>
  );
};
