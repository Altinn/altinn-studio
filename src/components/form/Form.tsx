import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import Grid from '@material-ui/core/Grid';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { Loader } from 'src/core/loading/Loader';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useExpandedWidthLayouts } from 'src/features/form/layout/LayoutsContext';
import { useNavigateToNode, useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import {
  SearchParams,
  useNavigate,
  useNavigationParam,
  useNavigationPath,
  useQueryKey,
  useQueryKeysAsString,
  useQueryKeysAsStringAsRef,
} from 'src/features/routing/AppRoutingContext';
import { useOnFormSubmitValidation } from 'src/features/validation/callbacks/onFormSubmitValidation';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { useCurrentView, useNavigatePage, useStartUrl } from 'src/hooks/useNavigatePage';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { extractBottomButtons } from 'src/utils/formLayout';
import { getPageTitle } from 'src/utils/getPageTitle';
import { NodesInternal, useGetPage, useNode } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import type { NavigateToNodeOptions } from 'src/features/form/layout/NavigateToNode';
import type { AnyValidation, BaseValidation, NodeRefValidation } from 'src/features/validation';
import type { NodeData } from 'src/utils/layout/types';

interface FormState {
  hasRequired: boolean;
  mainIds: string[] | undefined;
  errorReportIds: string[];
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
}

export function Form() {
  const currentPageId = useCurrentView();

  return <FormPage currentPageId={currentPageId} />;
}

export function FormPage({ currentPageId }: { currentPageId: string | undefined }) {
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();
  const [formState, setFormState] = useState<FormState>({
    hasRequired: false,
    mainIds: undefined,
    errorReportIds: [],
    formErrors: [],
    taskErrors: [],
  });
  const { hasRequired, mainIds, errorReportIds, formErrors, taskErrors } = formState;
  const requiredFieldsMissing = NodesInternal.usePageHasVisibleRequiredValidations(currentPageId);

  useRedirectToStoredPage();
  useSetExpandedWidth();

  useRegisterNodeNavigationHandler(async (targetNode, options) => {
    const targetView = targetNode?.pageKey;
    if (targetView && targetView !== currentPageId) {
      await navigateToPage(targetView, {
        ...options?.pageNavOptions,
        shouldFocusComponent: options?.shouldFocus ?? options?.pageNavOptions?.shouldFocusComponent ?? true,
        replace:
          window.location.href.includes(SearchParams.FocusComponentId) ||
          window.location.href.includes(SearchParams.ExitSubform),
      });
      return true;
    }
    return false;
  });

  if (!currentPageId || !isValidPageId(currentPageId)) {
    return <FormFirstPage />;
  }

  if (mainIds === undefined) {
    return (
      <>
        <ErrorProcessing setFormState={setFormState} />
        <Loader reason='form-ids' />
      </>
    );
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
      <Helmet>
        <title>{`${getPageTitle(appName, hasSetCurrentPageId ? langAsString(currentPageId) : undefined, appOwner)}`}</title>
      </Helmet>
      <ErrorProcessing setFormState={setFormState} />
      {hasRequired && (
        <MessageBanner
          error={requiredFieldsMissing}
          messageKey={'form_filler.required_description'}
        />
      )}
      <Grid
        container={true}
        spacing={6}
        alignItems='flex-start'
      >
        {mainIds.map((id) => (
          <GenericComponentById
            key={id}
            id={id}
          />
        ))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
          className={classes.errorReport}
        >
          <ErrorReport
            renderIds={errorReportIds}
            formErrors={formErrors}
            taskErrors={taskErrors}
          />
        </Grid>
      </Grid>
      <ReadyForPrint type='load' />
      <HandleNavigationFocusComponent />
    </>
  );
}

export function FormFirstPage() {
  const navigate = useNavigate();
  const startUrl = useStartUrl();

  const currentLocation = `${useNavigationPath()}${useQueryKeysAsString()}`;

  useEffect(() => {
    if (currentLocation !== startUrl) {
      navigate(startUrl, { replace: true });
    }
  }, [currentLocation, navigate, startUrl]);

  return <Loader reason='navigate-to-start' />;
}

/**
 * Redirects users that had a stored page in their local storage to the correct
 * page, and later removes this currentViewCacheKey from localstorage, as
 * it is no longer needed.
 */
function useRedirectToStoredPage() {
  const pageKey = useCurrentView();
  const partyId = useNavigationParam('partyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const applicationMetadataId = useApplicationMetadata()?.id;

  const instanceId = `${partyId}/${instanceGuid}`;
  const currentViewCacheKey = instanceId || applicationMetadataId;

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
interface ErrorProcessingProps {
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}

function nodeDataIsRequired(n: NodeData) {
  const item = n.item;
  return !!(item && 'required' in item && item.required === true);
}

/**
 * Instead of re-rendering the entire Form component when any of this changes, we just report the
 * state to the parent component.
 */
function ErrorProcessing({ setFormState }: ErrorProcessingProps) {
  const currentPageId = useCurrentView();
  const page = useGetPage(currentPageId);
  const traversalSelector = useNodeTraversalSelector();

  const topLevelNodeIds = traversalSelector(
    (traverser) => {
      if (!page) {
        return emptyArray;
      }

      const all = traverser.with(page).children();
      return all.map((n) => n.id);
    },
    [currentPageId],
  );

  const hasRequired = traversalSelector(
    (traverser) => {
      if (!page) {
        return false;
      }
      return traverser.with(page).flat((n) => n.type === 'node' && nodeDataIsRequired(n)).length > 0;
    },
    [currentPageId],
  );

  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);

  const [mainIds, errorReportIds] = traversalSelector(
    (traverser) => {
      if (!hasErrors || !page) {
        return [topLevelNodeIds, emptyArray];
      }
      return extractBottomButtons(traverser.with(page).children());
    },
    [currentPageId, hasErrors],
  );

  useEffect(() => {
    setFormState({ hasRequired, mainIds, errorReportIds, formErrors, taskErrors });
  }, [setFormState, hasRequired, mainIds, errorReportIds, formErrors, taskErrors]);

  return null;
}

function HandleNavigationFocusComponent() {
  const onFormSubmitValidation = useOnFormSubmitValidation();
  const searchStringRef = useQueryKeysAsStringAsRef();
  const componentId = useQueryKey(SearchParams.FocusComponentId);
  const exitSubform = useQueryKey(SearchParams.ExitSubform)?.toLocaleLowerCase() === 'true';
  const validate = useQueryKey(SearchParams.Validate)?.toLocaleLowerCase() === 'true';
  const focusNode = useNode(componentId ?? undefined);
  const navigateTo = useNavigateToNode();
  const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      // Replace URL if we have query params
      if (focusNode || exitSubform || validate) {
        const location = new URLSearchParams(searchStringRef.current);
        location.delete(SearchParams.FocusComponentId);
        location.delete(SearchParams.ExitSubform);
        location.delete(SearchParams.Validate);
        const baseHash = window.location.hash.slice(1).split('?')[0];
        const nextLocation = location.size > 0 ? `${baseHash}?${location.toString()}` : baseHash;
        navigate(nextLocation, { replace: true });
      }

      // Set validation visibility to the equivalent of trying to submit
      if (validate) {
        onFormSubmitValidation();
      }

      // Focus on node?
      if (focusNode) {
        const nodeNavOptions: NavigateToNodeOptions = {
          shouldFocus: true,
          pageNavOptions: {
            resetReturnToView: !exitSubform,
          },
        };
        await navigateTo(focusNode, nodeNavOptions);
      }
    })();
  }, [navigateTo, focusNode, navigate, searchStringRef, exitSubform, validate, onFormSubmitValidation]);

  return null;
}
