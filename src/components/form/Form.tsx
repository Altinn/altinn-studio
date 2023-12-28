import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { usePageNavigationContext } from 'src/features/form/layout/PageNavigationContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getFieldName } from 'src/utils/formComponentUtils';
import { extractBottomButtons, hasRequiredFields } from 'src/utils/formLayout';
import { useNodes } from 'src/utils/layout/NodesContext';
import { getFormHasErrors, missingFieldsInLayoutValidations } from 'src/utils/validation/validation';

export function Form() {
  const nodes = useNodes();
  const langTools = useLanguage();
  const { navigateToPage, currentPageId, isValidPageId } = useNavigatePage();
  const validations = useAppSelector((state) => state.formValidations.validations);
  useRedirectToStoredPage();

  const { scrollPosition } = usePageNavigationContext();
  useEffect(() => {
    if (currentPageId !== undefined && scrollPosition === undefined) {
      window.scrollTo({ top: 0 });
    }
  }, [currentPageId, scrollPosition]);

  useRegisterNodeNavigationHandler((targetNode) => {
    const targetView = targetNode?.top.top.myKey;
    if (targetView && targetView !== currentPageId) {
      navigateToPage(targetView);
      return true;
    }
    return false;
  });

  const page = nodes?.all?.()?.[currentPageId];
  const hasErrors = useAppSelector((state) => getFormHasErrors(state.formValidations.validations));

  const requiredFieldsMissing = React.useMemo(() => {
    if (validations && validations[currentPageId]) {
      const requiredValidationTextResources: string[] = [];
      page?.flat(true).forEach((node) => {
        const trb = node.item.textResourceBindings;
        const fieldName = getFieldName(trb, langTools);
        if ('required' in node.item && node.item.required && trb && 'requiredValidation' in trb) {
          requiredValidationTextResources.push(langTools.langAsString(trb.requiredValidation, [fieldName]));
        }
      });

      return missingFieldsInLayoutValidations(validations[currentPageId], requiredValidationTextResources, langTools);
    }

    return false;
  }, [validations, currentPageId, page, langTools]);

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
