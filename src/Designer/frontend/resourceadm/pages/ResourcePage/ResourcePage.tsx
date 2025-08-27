import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import classes from './ResourcePage.module.css';
import { PolicyEditorPage } from '../PolicyEditorPage';
import { getResourceDashboardURL, getResourcePageURL } from '../../utils/urlUtils';
import { DeployResourcePage } from '../DeployResourcePage';
import { useSinlgeResourceQuery, useValidatePolicyQuery } from '../../hooks/queries';
import { AboutResourcePage } from '../AboutResourcePage';
import { NavigationModal } from '../../components/NavigationModal';
import { useEditResourceMutation } from '../../hooks/mutations';
import { MigrationPage } from '../MigrationPage';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  GavelSoundBlockIcon,
  InformationSquareIcon,
  MigrationIcon,
  UploadIcon,
} from 'libs/studio-icons/src';
import { deepCompare, getAltinn2Reference, validateResource } from '../../utils/resourceUtils';
import type { EnvId } from '../../utils/resourceUtils';
import { ResourceAccessLists } from '../../components/ResourceAccessLists';
import { AccessListDetail } from '../../components/AccessListDetails';
import { useGetAccessListQuery } from '../../hooks/queries/useGetAccessListQuery';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioContentMenu, StudioSpinner } from 'libs/studio-components-legacy/src';
import type { StudioContentMenuButtonTabProps } from 'libs/studio-components-legacy/src';
import { useGetConsentTemplates } from '../../hooks/queries/useGetConsentTemplates';

/**
 * @component
 *    Displays the 4 pages to manage resources and a left navigation bar.
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourcePage = (): React.JSX.Element => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const autoSaveTimeoutRef = useRef(undefined);
  const policyErrorModalRef = useRef<HTMLDialogElement>(null);
  const resourceErrorModalRef = useRef<HTMLDialogElement>(null);

  const { pageType, resourceId, org, app, env, accessListId } = useUrlParams();
  const currentPage = pageType as NavigationBarPage;

  // Stores the temporary next page
  const [nextPage, setNextPage] = useState<NavigationBarPage>('about');

  // Use a local resource object as model to update immediately after user input. Use debounce to save this object every 500 ms
  const [resourceData, setResourceData] = useState<Resource | null>(null);

  // Handle the state of resource and policy errors
  const [showResourceErrors, setShowResourceErrors] = useState(false);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);

  // Get metadata for policy
  const { refetch: refetchValidatePolicy } = useValidatePolicyQuery(org, app, resourceId);

  const { data: loadedResourceData, isPending: resourcePending } = useSinlgeResourceQuery(
    org,
    app,
    resourceId,
  );

  const { data: accessList } = useGetAccessListQuery(org, accessListId, env);
  const { data: consentTemplates } = useGetConsentTemplates(
    org,
    resourceData?.resourceType === 'Consent',
  );

  // Mutation function for editing a resource
  const { mutateAsync: editResource, isPending: isSavingResource } = useEditResourceMutation(
    org,
    app,
    resourceId,
  );

  // Set resourceData when loaded from server. Should only be called once
  useEffect(() => {
    if (!resourceData && loadedResourceData) {
      setResourceData(loadedResourceData);
    }
  }, [loadedResourceData, resourceData]);

  const debounceSave = (resource: Resource): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      editResource(resource);
    }, 400);
  };

  /**
   * Navigates to the selected page
   */
  const navigateToPage = async (page: NavigationBarPage) => {
    if (currentPage !== page) {
      // Validate Resource and display errors + modal
      if (currentPage === 'about') {
        if (validationErrors.length === 0) {
          setShowResourceErrors(false);
          handleNavigation(page);
        } else {
          window.scrollTo(0, 0);
          setShowResourceErrors(true);
          setNextPage(page);
          resourceErrorModalRef.current.showModal();
        }
      }
      // Validate Ppolicy and display errors + modal
      else if (currentPage === 'policy') {
        const data = await refetchValidatePolicy();
        const validationStatus = data?.data?.status ?? null;

        if (validationStatus === 200) {
          setShowPolicyErrors(false);
          handleNavigation(page);
        } else {
          setShowPolicyErrors(true);
          setNextPage(page);
          policyErrorModalRef.current.showModal();
        }
      }
      // Else navigate
      else handleNavigation(page);
    }
  };

  /**
   * Handles the navigation from one page to another.
   *
   * @param newPage the page to navigate to
   */
  const handleNavigation = (newPage: NavigationBarPage) => {
    closeNavigationModals();
    navigate(getResourcePageURL(org, app, resourceId, newPage));
  };

  const closeNavigationModals = (): void => {
    policyErrorModalRef.current?.close();
    resourceErrorModalRef.current?.close();
  };

  /**
   * Handles the navigation to a page that has erros. This is used from the deploy
   * page when information is displayed about errors on the policy or the resource page.
   *
   * @param page the page to navigate to
   */
  const navigateToPageWithError = async (page: NavigationBarPage) => {
    if (page === 'about') {
      setShowResourceErrors(true);
    }
    if (page === 'policy') {
      setShowPolicyErrors(true);
    }
    handleNavigation(page);
  };

  const navigateFromWarningModal = (): void => {
    handleNavigation(nextPage);
  };

  const validationErrors = validateResource(resourceData, t);
  const altinn2References = getAltinn2Reference(resourceData);
  /**
   * Decide if the migration page should be accessible or not
   */
  const isMigrateEnabled = (): boolean => {
    return !!altinn2References && resourceData.resourceType === 'GenericAccessResource';
  };

  const aboutPageId = 'about';
  const policyPageId = 'policy';
  const deployPageId = 'deploy';
  const migrationPageId = 'migration';
  const accessListsPageId = 'accesslists';

  /**
   * Saves the resource
   */
  const handleSaveResource = (r: Resource) => {
    if (!deepCompare(resourceData, r)) {
      setResourceData(r);
      debounceSave(r);
    }
  };

  const getContentMenuItems = (): StudioContentMenuButtonTabProps<NavigationBarPage>[] => {
    const contentMenuItems: StudioContentMenuButtonTabProps<NavigationBarPage>[] = [
      {
        tabId: 'about',
        tabName: t('resourceadm.left_nav_bar_about'),
        icon: <InformationSquareIcon />,
      },
      {
        tabId: 'policy',
        tabName: t('resourceadm.left_nav_bar_policy'),
        icon: <GavelSoundBlockIcon />,
      },
      {
        tabId: 'deploy',
        tabName: t('resourceadm.left_nav_bar_deploy'),
        icon: <UploadIcon />,
      },
    ];
    if (isMigrateEnabled()) {
      contentMenuItems.push({
        tabId: 'migration',
        tabName: t('resourceadm.left_nav_bar_migration'),
        icon: <MigrationIcon />,
      });
    }
    return contentMenuItems;
  };

  return (
    <div className={classes.resourceWrapper}>
      <div className={classes.leftNavWrapper}>
        <StudioContentMenu.Static
          onChangeTab={(tabId: NavigationBarPage) => {
            if (tabId !== 'back') {
              navigateToPage(tabId);
            }
          }}
          selectedTabId={
            currentPage === migrationPageId && !isMigrateEnabled() ? aboutPageId : currentPage
          }
        >
          <StudioContentMenu.LinkTab
            tabId='back'
            tabName={t('resourceadm.left_nav_bar_back')}
            icon={<ArrowLeftIcon />}
            renderTab={(props) => <Link to={getResourceDashboardURL(org, app)} {...props} />}
          />
          {getContentMenuItems().map((menuItem) => {
            return <StudioContentMenu.ButtonTab key={menuItem.tabId} {...menuItem} />;
          })}
        </StudioContentMenu.Static>
      </div>
      {resourcePending || !resourceData ? (
        <div className={classes.spinnerWrapper}>
          <StudioSpinner
            size='xl'
            variant='interaction'
            spinnerTitle={t('resourceadm.about_resource_spinner')}
          />
        </div>
      ) : (
        <div className={classes.resourcePageWrapper}>
          {currentPage === aboutPageId && (
            <AboutResourcePage
              resourceData={resourceData}
              validationErrors={showResourceErrors ? validationErrors : []}
              onSaveResource={handleSaveResource}
              consentTemplates={consentTemplates}
              id='page-content-about'
            />
          )}
          {currentPage === policyPageId && (
            <PolicyEditorPage showAllErrors={showPolicyErrors} id='page-content-policy' />
          )}
          {currentPage === deployPageId && (
            <DeployResourcePage
              navigateToPageWithError={navigateToPageWithError}
              resourceVersionText={loadedResourceData?.version ?? ''}
              onSaveVersion={(version: string) =>
                handleSaveResource({
                  ...resourceData,
                  version: version?.trim(), // empty version is not allowed
                })
              }
              id='page-content-deploy'
              isSavingResource={isSavingResource}
            />
          )}
          {currentPage === migrationPageId && isMigrateEnabled() && (
            <MigrationPage
              id='page-content-migration'
              serviceCode={altinn2References[0]}
              serviceEdition={altinn2References[1]}
            />
          )}
          {currentPage === accessListsPageId && env && !accessListId && (
            <ResourceAccessLists env={env as EnvId} resourceData={resourceData} />
          )}
          {currentPage === accessListsPageId && env && accessList && (
            <AccessListDetail
              key={accessList.identifier}
              org={org}
              env={env}
              list={accessList}
              backUrl={`${getResourcePageURL(org, app, resourceId, 'accesslists')}/${env}`}
            />
          )}
        </div>
      )}
      <NavigationModal
        ref={policyErrorModalRef}
        onClose={closeNavigationModals}
        onNavigate={navigateFromWarningModal}
        title={t('resourceadm.resource_navigation_modal_title_policy')}
      />
      <NavigationModal
        ref={resourceErrorModalRef}
        onClose={closeNavigationModals}
        onNavigate={navigateFromWarningModal}
        title={t('resourceadm.resource_navigation_modal_title_resource')}
      />
    </div>
  );
};
