import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PaymentDetailsDef } from 'src/layout/PaymentDetails/config.def.generated';
import { PaymentDetailsComponent } from 'src/layout/PaymentDetails/PaymentDetailsComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class PaymentDetails extends PaymentDetailsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PaymentDetails'>>(
    function LayoutComponentPaymentDetailsRender(props, _): JSX.Element | null {
      return <PaymentDetailsComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <PaymentDetailsComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <PaymentDetailsComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
