import React from 'react';

import Grid from '@material-ui/core/Grid';

import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { GenericComponent } from 'src/layout/GenericComponent';
import { extractBottomButtons } from 'src/utils/formLayout';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { getFormHasErrors } from 'src/utils/validation/validation';

export function CustomReceipt() {
  const receiptLayoutName = useAppSelector((state) => state.formLayout.uiConfig.receiptLayoutName);
  const page = useExprContext()?.findLayout(receiptLayoutName);
  const language = useAppSelector((state) => state.language.language);
  const hasErrors = useAppSelector((state) => getFormHasErrors(state.formValidations.validations));

  const [mainNodes, errorReportNodes] = React.useMemo(() => {
    if (!page) {
      return [[], []];
    }
    return hasErrors ? extractBottomButtons(page) : [page.children(), []];
  }, [page, hasErrors]);

  if (!language || !page) {
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
        {mainNodes.map((node) => (
          <GenericComponent
            key={node.item.id}
            node={node}
          />
        ))}
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
