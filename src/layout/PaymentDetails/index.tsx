import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PaymentDetailsDef } from 'src/layout/PaymentDetails/config.def.generated';
import { PaymentDetailsComponent } from 'src/layout/PaymentDetails/PaymentDetailsComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class PaymentDetails extends PaymentDetailsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PaymentDetails'>>(
    function LayoutComponentPaymentDetailsRender(props, _): JSX.Element | null {
      return <PaymentDetailsComponent {...props} />;
    },
  );
}
