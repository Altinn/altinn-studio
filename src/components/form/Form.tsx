import React from 'react';

import Grid from '@material-ui/core/Grid';

import classes from 'src/components/form/Form.module.css';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getFieldName } from 'src/utils/formComponentUtils';
import { extractBottomButtons, hasRequiredFields } from 'src/utils/formLayout';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { getFormHasErrors, missingFieldsInLayoutValidations } from 'src/utils/validation/validation';

export function Form() {
  const langTools = useLanguage();
  const { currentPageId } = useNavigatePage();
  const validations = useAppSelector((state) => state.formValidations.validations);
  const nodes = useExprContext();

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
