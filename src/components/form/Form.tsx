import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import deepEqual from 'fast-deep-equal';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useExpandedWidthLayouts } from 'src/features/form/layout/LayoutsContext';
import { useNavigateToNode, useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import {
  useNavigate,
  useNavigationParam,
  useQueryKey,
  useQueryKeysAsStringAsRef,
} from 'src/features/routing/AppRoutingContext';
import { FrontendValidationSource } from 'src/features/validation';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { SearchParams, useCurrentView, useNavigatePage, useStartUrl } from 'src/hooks/useNavigatePage';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { extractBottomButtons } from 'src/utils/formLayout';
import { useGetPage, useNode } from 'src/utils/layout/NodesContext';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { NodeData } from 'src/utils/layout/types';

interface FormState {
  hasRequired: boolean;
  requiredFieldsMissing: boolean;
  mainIds: string[] | undefined;
  errorReportIds: string[];
}

export function Form() {
  const currentPageId = useCurrentView();
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const [formState, setFormState] = useState<FormState>({
    hasRequired: false,
    requiredFieldsMissing: false,
    mainIds: undefined,
    errorReportIds: [],
  });
  const { hasRequired, requiredFieldsMissing, mainIds, errorReportIds } = formState;

  useRedirectToStoredPage();
  useSetExpandedWidth();

  useRegisterNodeNavigationHandler(async (targetNode, options) => {
    const targetView = targetNode?.pageKey;
    if (targetView && targetView !== currentPageId) {
      await navigateToPage(targetView, {
        ...options?.pageNavOptions,
        shouldFocusComponent: options?.shouldFocus ?? options?.pageNavOptions?.shouldFocusComponent ?? true,
        replace: window.location.href.includes(SearchParams.FocusComponentId),
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
        <Loader
          reason='form-ids'
          renderPresentation={false}
        />
      </>
    );
  }

  return (
    <>
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
          <ErrorReport renderIds={errorReportIds} />
        </Grid>
      </Grid>
      <ReadyForPrint />
      <HandleNavigationFocusComponent />
    </>
  );
}

export function FormFirstPage() {
  const startUrl = useStartUrl();
  return (
    <Navigate
      to={startUrl}
      replace
    />
  );
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
  const location = useLocation().pathname;

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
  }, [pageKey, currentViewCacheKey, isValidPageId, location, navigateToPage]);
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

  const topLevelNodeIds = useNodeTraversal((traverser) => {
    if (!page) {
      return emptyArray;
    }

    const all = traverser.with(page).children();
    return all.map((n) => n.id);
  });

  const hasRequired = useNodeTraversal((traverser) => {
    if (!page) {
      return false;
    }
    return traverser.with(page).flat((n) => n.type === 'node' && nodeDataIsRequired(n)).length > 0;
  });

  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);
  const [mainIds, errorReportIds] = useNodeTraversal((traverser) => {
    if (!hasErrors || !page) {
      return [topLevelNodeIds, []];
    }
    return extractBottomButtons(traverser.with(page).children());
  });
  const requiredFieldsMissing = formErrors.some(
    (error) => error.source === FrontendValidationSource.EmptyField && error.node.pageKey === currentPageId,
  );

  useEffect(() => {
    setFormState((prevState) => {
      if (
        prevState.hasRequired === hasRequired &&
        prevState.requiredFieldsMissing === requiredFieldsMissing &&
        deepEqual(mainIds, prevState.mainIds) &&
        deepEqual(errorReportIds, prevState.errorReportIds)
      ) {
        return prevState;
      }

      return {
        hasRequired,
        requiredFieldsMissing,
        mainIds,
        errorReportIds,
      };
    });
  }, [setFormState, hasRequired, requiredFieldsMissing, mainIds, errorReportIds]);

  return null;
}

function HandleNavigationFocusComponent() {
  const searchStringRef = useQueryKeysAsStringAsRef();
  const componentId = useQueryKey(SearchParams.FocusComponentId);
  const focusNode = useNode(componentId ?? undefined);
  const navigateTo = useNavigateToNode();
  const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      if (focusNode) {
        await navigateTo(focusNode, { shouldFocus: true });
        const location = new URLSearchParams(searchStringRef.current);
        location.delete(SearchParams.FocusComponentId);
        const baseHash = window.location.hash.slice(1).split('?')[0];
        const nextLocation = location.size > 0 ? `${baseHash}?${location.toString()}` : baseHash;
        navigate(nextLocation, { replace: true });
      }
    })();
  }, [navigateTo, focusNode, navigate, searchStringRef]);

  return null;
}
