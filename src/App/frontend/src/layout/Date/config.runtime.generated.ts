import { componentConfig } from '@app/layout-contract/generated/components/Date/config.generated';

import { Date } from 'src/layout/Date/index';

export function getConfig() {
  return {
    def: new Date(),
    ...componentConfig,
  };
}

// Source hash: a2bc52a6f322e3fde75d5e171947720af7e2a5143b2d2a94127291e96921fff5
