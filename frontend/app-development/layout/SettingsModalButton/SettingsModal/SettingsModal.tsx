import React, { ReactNode, useState } from 'react';
import classes from './SettingsModal.module.css';
import { Alert, ErrorMessage, Heading, Paragraph, Spinner } from '@digdir/design-system-react';
import {
  CogIcon,
  InformationSquareIcon,
  PersonSuitIcon,
  MonitorIcon,
  ShieldLockIcon,
} from '@navikt/aksel-icons';
import { Modal } from 'app-shared/components/Modal';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './utils';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AbouTab';
import { LocalChangesTab } from './components/Tabs/LocalChangesTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';
import {
  useAppPolicyQuery,
  useAppConfigQuery,
  useAppMetadataQuery,
} from 'app-development/hooks/queries';
import { useRepoInitialCommitQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { Center } from 'app-shared/components/Center';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

export type SettingsModalProps = {
  /**
   * Flag for if the modal is open
   */
  isOpen: boolean;
  /**
   * Function to be executed on close
   * @returns void
   */
  onClose: () => void;
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the settings modal.
 *
 * @property {boolean}[isOpen] - Flag for if the modal is open
 * @property {function}[onClose] - Function to be executed on close
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SettingsModal = ({ isOpen, onClose, org, app }: SettingsModalProps): ReactNode => {
  const { t } = useTranslation();

  const {
    status: policyStatus,
    data: policyData,
    error: policyError,
  } = useAppPolicyQuery(org, app);
  const {
    status: appConfigStatus,
    data: appConfigData,
    error: appConfigError,
  } = useAppConfigQuery(org, app);
  const {
    status: repositoryStatus,
    data: repositoryData,
    error: repositoryError,
  } = useRepoMetadataQuery(org, app);
  const {
    status: initialCommitStatus,
    data: initialCommitData,
    error: initialCommitError,
  } = useRepoInitialCommitQuery(org, app);
  const {
    status: appMetadataStatus,
    data: appMetadataData,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const [currentTab, setCurrentTab] = useState<SettingsModalTab>('about');

  /**
   * Ids for the navigation tabs
   */
  const aboutTabId: SettingsModalTab = 'about';
  const policyTabId: SettingsModalTab = 'policy';
  const localChangesTabId: SettingsModalTab = 'localChanges';
  const accessControlTabId: SettingsModalTab = 'accessControl';

  /**
   * The tabs to display in the navigation bar
   */
  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutTabId,
      () => changeTabTo(aboutTabId),
      currentTab,
    ),
    createNavigationTab(
      <ShieldLockIcon className={classes.icon} />,
      policyTabId,
      () => changeTabTo(policyTabId),
      currentTab,
    ),
    createNavigationTab(
      <PersonSuitIcon className={classes.icon} />,
      accessControlTabId,
      () => changeTabTo(accessControlTabId),
      currentTab,
    ),
    createNavigationTab(
      <MonitorIcon className={classes.icon} />,
      localChangesTabId,
      () => changeTabTo(localChangesTabId),
      currentTab,
    ),
  ];

  /**
   * Changes the active tab
   * @param tabId
   */
  const changeTabTo = (tabId: SettingsModalTab) => {
    setCurrentTab(tabId);
  };

  /**
   * Displays the currently selected tab and its content
   * @returns
   */
  const displayTabs = () => {
    switch (currentTab) {
      case 'about': {
        return (
          <AboutTab
            appConfig={appConfigData}
            org={org}
            app={app}
            repository={repositoryData}
            createdBy={initialCommitData.author.name}
          />
        );
      }
      case 'policy': {
        return <PolicyTab policy={policyData} org={org} app={app} />;
      }
      case 'accessControl': {
        return <AccessControlTab appMetadata={appMetadataData} org={org} app={app} />;
      }
      case 'localChanges': {
        return <LocalChangesTab org={org} app={app} />;
      }
    }
  };

  /**
   * Based on the state of the API calls, display spinner, error or components
   */
  const displayModalContent = () => {
    switch (
      mergeQueryStatuses(
        policyStatus,
        appConfigStatus,
        appMetadataStatus,
        repositoryStatus,
        initialCommitStatus,
      )
    ) {
      case 'loading': {
        return (
          <div className={classes.modalContent}>
            <Center>
              <Spinner
                size='2xLarge'
                variant='interaction'
                title={t('settings_modal.loading_content')}
              />
            </Center>
          </div>
        );
      }
      case 'error': {
        return (
          <Center>
            <Alert severity='danger'>
              <Paragraph>{t('general.fetch_error_message')}</Paragraph>
              <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
              {policyError && <ErrorMessage>{policyError.message}</ErrorMessage>}
              {appConfigError && <ErrorMessage>{appConfigError.message}</ErrorMessage>}
              {repositoryError && <ErrorMessage>{repositoryError.message}</ErrorMessage>}
              {initialCommitError && <ErrorMessage>{initialCommitError.message}</ErrorMessage>}
              {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
            </Alert>
          </Center>
        );
      }
      case 'success': {
        return (
          <div className={classes.modalContent}>
            <div className={classes.leftNavWrapper}>
              <LeftNavigationBar tabs={leftNavigationTabs} className={classes.leftNavigationBar} />
            </div>
            <div className={classes.tabWrapper}>{displayTabs()}</div>
          </div>
        );
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <CogIcon className={classes.icon} />
          <Heading level={1} size='medium'>
            {t('settings_modal.heading')}
          </Heading>
        </div>
      }
    >
      {displayModalContent()}
    </Modal>
  );
};
