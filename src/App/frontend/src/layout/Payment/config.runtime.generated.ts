import { componentConfig } from '@app/layout-contract/generated/components/Payment/config.generated';

import { Payment } from 'src/layout/Payment/index';

export function getConfig() {
  return {
    def: new Payment(),
    ...componentConfig,
  };
}

// Source hash: 00c72840291d93b22ca574810d72ecd01ee89c8984df446b6cd88239471729a8
