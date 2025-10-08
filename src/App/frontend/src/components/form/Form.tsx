import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport, ErrorReportList } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { NavigateToStartUrl } from 'src/components/wrappers/ProcessWrapper';
import { SearchParams } from 'src/core/routing/types';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useAllAttachments } from 'src/features/attachments/hooks';
import { FileScanResults } from 'src/features/attachments/types';
import { useExpandedWidthLayouts, useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { useQueryKey } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useCurrentView, useNavigatePage } from 'src/hooks/useNavigatePage';
import { getComponentCapabilities } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getPageTitle } from 'src/utils/getPageTitle';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, BaseValidation, NodeRefValidation } from 'src/features/validation';

interface FormState {
  hasRequired: boolean;
  mainIds: string[];
  errorReportIds: string[];
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
}

export function Form() {
  const currentPageId = useCurrentView();

  return <FormPage currentPageId={currentPageId} />;
}

export function FormPage({ currentPageId }: { currentPageId: string | undefined }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldValidateFormPage = searchParams.get(SearchParams.Validate);
  const onFormSubmitValidation = useOnFormSubmitValidation();

  useEffect(() => {
    if (shouldValidateFormPage) {
      onFormSubmitValidation();
      setSearchParams((params) => {
        params.delete(SearchParams.Validate);
        return searchParams;
      });
    }
  }, [onFormSubmitValidation, searchParams, setSearchParams, shouldValidateFormPage]);

  const { isValidPageId } = useNavigatePage();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const { hasRequired, mainIds, errorReportIds, formErrors, taskErrors } = useFormState(currentPageId);
  const requiredFieldsMissing = NodesInternal.usePageHasVisibleRequiredValidations(currentPageId);
  const allAttachments = useAllAttachments();

  const hasInfectedFiles = Object.values(allAttachments || {}).some((attachments) =>
    (attachments || []).some(
      (attachment) => attachment.uploaded && attachment.data.fileScanResult === FileScanResults.Infected,
    ),
  );

  useRedirectToStoredPage();
  useSetExpandedWidth();

  if (!currentPageId || !isValidPageId(currentPageId)) {
    return <NavigateToStartUrl forceCurrentTask={false} />;
  }

  const hasSetCurrentPageId = langAsString(currentPageId) !== currentPageId;

  if (!hasSetCurrentPageId) {
    window.logWarnOnce(
      `You have not set a page title for this page. This is highly recommended for user experience and WCAG compliance and will be required in the future.
       To add a title to this page, add this to your language resource file (for example language.nb.json):

      {
        "id": "${currentPageId}",
         "value": "Your custom title goes here"
      }`,
    );
  }

  return (
    <>
      <title>{`${getPageTitle(appName, hasSetCurrentPageId ? langAsString(currentPageId) : undefined, appOwner)}`}</title>
      {hasRequired && (
        <MessageBanner
          error={requiredFieldsMissing}
          messageKey='form_filler.required_description'
        />
      )}
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {mainIds.map((id) => (
          <GenericComponent
            key={id}
            baseComponentId={id}
          />
        ))}
        <Flex
          item={true}
          size={{ xs: 12 }}
          aria-live='polite'
          className={classes.errorReport}
        >
          <ErrorReport
            show={formErrors.length > 0 || taskErrors.length > 0 || hasInfectedFiles}
            errors={
              <ErrorReportList
                formErrors={formErrors}
                taskErrors={taskErrors}
              />
            }
          >
            {errorReportIds.map((id) => (
              <GenericComponent
                key={id}
                baseComponentId={id}
              />
            ))}
          </ErrorReport>
        </Flex>
      </Flex>
      <ReadyForPrint type='load' />
      <HandleNavigationFocusComponent />
    </>
  );
}

/**
 * Redirects users that had a stored page in their local storage to the correct
 * page, and later removes this currentViewCacheKey from localstorage, as
 * it is no longer needed.
 */
function useRedirectToStoredPage() {
  const pageKey = useCurrentView();
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const applicationMetadataId = useApplicationMetadata()?.id;

  const instanceId = useLaxInstanceId();
  const currentViewCacheKey = instanceId ?? applicationMetadataId;

  useEffect(() => {
    if (!pageKey && !!currentViewCacheKey) {
      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage !== null && isValidPageId(lastVisitedPage)) {
        localStorage.removeItem(currentViewCacheKey);
        navigateToPage(lastVisitedPage, { replace: true });
      }
    }
  }, [pageKey, currentViewCacheKey, isValidPageId, navigateToPage]);
}

/**
 * Sets the expanded width for the current page if it is defined in the currently viewed layout-page
 */
function useSetExpandedWidth() {
  const currentPageId = useCurrentView();
  const expandedPagesFromLayout = useExpandedWidthLayouts();
  const expandedWidthFromSettings = usePageSettings().expandedWidth;
  const { setExpandedWidth } = useUiConfigContext();

  useEffect(() => {
    let defaultExpandedWidth = false;
    if (currentPageId && expandedPagesFromLayout[currentPageId] !== undefined) {
      defaultExpandedWidth = !!expandedPagesFromLayout[currentPageId];
    } else if (expandedWidthFromSettings !== undefined) {
      defaultExpandedWidth = expandedWidthFromSettings;
    }
    setExpandedWidth(defaultExpandedWidth);
  }, [currentPageId, expandedPagesFromLayout, expandedWidthFromSettings, setExpandedWidth]);
}

const emptyArray = [];
function useFormState(currentPageId: string | undefined): FormState {
  const lookups = useLayoutLookups();
  const topLevelIds = currentPageId ? (lookups.topLevelComponents[currentPageId] ?? emptyArray) : emptyArray;
  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);

  const [mainIds, errorReportIds] = useMemo(() => {
    if (!hasErrors) {
      return [topLevelIds, emptyArray];
    }

    const toMainLayout: string[] = [];
    const toErrorReport: string[] = [];

    for (const id of [...topLevelIds].reverse()) {
      const type = lookups.allComponents[id]?.type;
      if (!type) {
        continue;
      }

      const capabilities = getComponentCapabilities(type);
      const isButtonLike = type === 'ButtonGroup' || (capabilities.renderInButtonGroup && type !== 'Custom');
      if (isButtonLike && toMainLayout.length === 0) {
        toErrorReport.push(id);
      } else {
        toMainLayout.push(id);
      }
    }

    return [toMainLayout.reverse(), toErrorReport.reverse()];
  }, [hasErrors, lookups.allComponents, topLevelIds]);

  const hasRequired =
    (currentPageId &&
      lookups.allPerPage[currentPageId]?.some((id) => {
        const layout = lookups.allComponents[id];
        return layout && 'required' in layout && layout.required !== false;
      })) ||
    false;

  return {
    hasRequired,
    mainIds,
    errorReportIds,
    formErrors,
    taskErrors,
  };
}

function HandleNavigationFocusComponent() {
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const exitSubform = useQueryKey(SearchParams.ExitSubform)?.toLocaleLowerCase() === 'true';
  const validate = useQueryKey(SearchParams.Validate)?.toLocaleLowerCase() === 'true';
  const navigate = useNavigate();
  const searchStringRef = useAsRef(useLocation().search);

  React.useEffect(() => {
    (async () => {
      // Replace URL if we have query params
      if (exitSubform || validate) {
        const location = new URLSearchParams(searchStringRef.current);
        location.delete(SearchParams.ExitSubform);
        const baseHash = window.location.hash.slice(1).split('?')[0];
        const nextLocation = location.size > 0 ? `${baseHash}?${location.toString()}` : baseHash;
        navigate(nextLocation, { replace: true });
      }
    })();
  }, [navigate, searchStringRef, exitSubform, validate, onFormSubmitValidation]);

  return null;
}
