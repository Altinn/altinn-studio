import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { FrontendValidationSource } from 'src/features/validation';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { useCurrentView, useNavigatePage } from 'src/hooks/useNavigatePage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { extractBottomButtons, hasRequiredFields } from 'src/utils/formLayout';
import { useNodes } from 'src/utils/layout/NodesContext';

export function Form() {
  const currentPageId = useCurrentView();
  const { isValidPageId, navigateToPage } = useNavigatePage();
  const nodes = useNodes();
  const page = currentPageId && nodes?.all?.()?.[currentPageId];
  useRedirectToStoredPage();

  useRegisterNodeNavigationHandler((targetNode) => {
    const targetView = targetNode?.top.top.myKey;
    if (targetView && targetView !== currentPageId) {
      navigateToPage(targetView);
      return true;
    }
    return false;
  });

  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);
  const requiredFieldsMissing = formErrors.some(
    (error) => error.source === FrontendValidationSource.EmptyField && error.pageKey === currentPageId,
  );

  const [mainNodes, errorReportNodes] = React.useMemo(() => {
    if (!page) {
      return [[], []];
    }
    return hasErrors ? extractBottomButtons(page) : [page.children(), []];
  }, [page, hasErrors]);

  if (!currentPageId || !isValidPageId(currentPageId)) {
    return <FormFirstPage />;
  }

  return (
    <>
      {page && hasRequiredFields(page) && (
        <MessageBanner
          error={requiredFieldsMissing}
          messageKey={'form_filler.required_description'}
        />
      )}
      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {mainNodes?.map((n) => (
          <GenericComponent
            key={n.item.id}
            node={n}
          />
        ))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
          className={classes.errorReport}
        >
          <ErrorReport nodes={errorReportNodes} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}

export function FormFirstPage() {
  const { startUrl, queryKeys } = useNavigatePage();
  return (
    <Navigate
      to={startUrl + queryKeys}
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
  const { currentPageId, partyId, instanceGuid, isValidPageId, navigateToPage } = useNavigatePage();
  const applicationMetadataId = useApplicationMetadata()?.id;
  const location = useLocation().pathname;

  const instanceId = `${partyId}/${instanceGuid}`;
  const currentViewCacheKey = instanceId || applicationMetadataId;

  useEffect(() => {
    if (!currentPageId && !!currentViewCacheKey) {
      const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
      if (lastVisitedPage !== null && isValidPageId(lastVisitedPage)) {
        localStorage.removeItem(currentViewCacheKey);
        navigateToPage(lastVisitedPage, { replace: true });
      }
    }
  }, [currentPageId, currentViewCacheKey, isValidPageId, location, navigateToPage]);
}
