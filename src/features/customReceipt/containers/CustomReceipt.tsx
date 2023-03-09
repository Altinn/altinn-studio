import React from 'react';

import Grid from '@material-ui/core/Grid';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { renderLayoutNode } from 'src/features/form/containers/Form';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { extractBottomButtons } from 'src/utils/formLayout';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { getFormHasErrors } from 'src/utils/validation/validation';

export function CustomReceipt() {
  const page = useExprContext()?.current();
  const customReceipt = useAppSelector(
    (state) =>
      state.formLayout.layouts &&
      state.formLayout.uiConfig.receiptLayoutName &&
      state.formLayout.layouts[state.formLayout.uiConfig.receiptLayoutName],
  );
  const language = useAppSelector((state) => state.language.language);
  const hasErrors = useAppSelector((state) => getFormHasErrors(state.formValidations.validations));

  const [mainNodes, errorReportNodes] = React.useMemo(() => {
    if (!customReceipt || !page) {
      return [[], []];
    }
    return hasErrors ? extractBottomButtons(page) : [page.children(), []];
  }, [page, customReceipt, hasErrors]);

  if (!language || !customReceipt) {
    return null;
  }

  return (
    <>
      <Grid
        data-testid='custom-receipt'
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {mainNodes.map((node) => renderLayoutNode(node))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
        >
          <ErrorReport nodes={errorReportNodes} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
