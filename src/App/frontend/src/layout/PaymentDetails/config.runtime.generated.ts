import { componentConfig } from '@app/layout-contract/generated/components/PaymentDetails/config.generated';

import { PaymentDetails } from 'src/layout/PaymentDetails/index';

export function getConfig() {
  return {
    def: new PaymentDetails(),
    ...componentConfig,
  };
}

// Source hash: 69108647a0a0b14f8abca033ec377a287070bc24b09b263c0bdf6c1a04931dca
