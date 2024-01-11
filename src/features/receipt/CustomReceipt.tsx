import React from 'react';

import Grid from '@material-ui/core/Grid';

import { ErrorReport } from 'src/components/message/ErrorReport';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import classes from 'src/features/receipt/CustomReceipt.module.css';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { GenericComponent } from 'src/layout/GenericComponent';
import { extractBottomButtons } from 'src/utils/formLayout';
import { useNodes } from 'src/utils/layout/NodesContext';

export function CustomReceipt() {
  const receiptLayoutName = useLayoutSettings().receiptLayoutName;
  const page = useNodes()?.findLayout(receiptLayoutName);
  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);

  const [mainNodes, errorReportNodes] = React.useMemo(() => {
    if (!page) {
      return [[], []];
    }
    return hasErrors ? extractBottomButtons(page) : [page.children(), []];
  }, [page, hasErrors]);

  if (!page) {
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
          className={classes.errorReport}
        >
          <ErrorReport nodes={errorReportNodes} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
