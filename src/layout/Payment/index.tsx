import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PaymentDef } from 'src/layout/Payment/config.def.generated';
import { PaymentComponent } from 'src/layout/Payment/PaymentComponent';
import { PaymentSummary } from 'src/layout/Payment/PaymentSummary';
import { SummaryPaymentComponent } from 'src/layout/Payment/SummaryPaymentComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Payment extends PaymentDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Payment'>>(
    function LayoutComponentPaymentDetailsRender(props, _): JSX.Element | null {
      return <PaymentComponent {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps): React.JSX.Element | null {
    return <SummaryPaymentComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): React.JSX.Element | null {
    return <PaymentSummary {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }
}
