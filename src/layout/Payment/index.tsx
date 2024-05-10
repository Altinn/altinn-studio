import React, { forwardRef } from 'react';

import { PaymentDef } from 'src/layout/Payment/config.def.generated';
import { PaymentComponent } from 'src/layout/Payment/PaymentComponent';
import { SummaryPaymentComponent } from 'src/layout/Payment/SummaryPaymentComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Payment extends PaymentDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Payment'>>(
    function LayoutComponentPaymentDetailsRender(props, _): JSX.Element | null {
      return <PaymentComponent {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps<'Payment'>): React.JSX.Element | null {
    return <SummaryPaymentComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }
}
