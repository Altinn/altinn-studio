import React from 'react';

import Grid from '@material-ui/core/Grid';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { extractBottomButtons, topLevelComponents } from 'src/utils/formLayout';
import { getFormHasErrors } from 'src/utils/validation/validation';

export function CustomReceipt() {
  const customReceipt = useAppSelector(
    (state) =>
      state.formLayout.layouts &&
      state.formLayout.uiConfig.receiptLayoutName &&
      state.formLayout.layouts[state.formLayout.uiConfig.receiptLayoutName],
  );
  const language = useAppSelector((state) => state.language.language);
  const hasErrors = useAppSelector((state) => getFormHasErrors(state.formValidations.validations));

  const [mainComponents, errorReportComponents] = React.useMemo(() => {
    if (!customReceipt) {
      return [[], []];
    }
    const topLevel = topLevelComponents(customReceipt);
    return hasErrors ? extractBottomButtons(topLevel) : [topLevel, []];
  }, [customReceipt, hasErrors]);

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
        {mainComponents.map((component) => renderLayoutComponent(component, customReceipt))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
        >
          <ErrorReport components={errorReportComponents} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
