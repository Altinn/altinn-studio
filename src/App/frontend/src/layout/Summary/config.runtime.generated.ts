import { componentConfig } from '@app/layout-contract/generated/components/Summary/config.generated';

import { Summary } from 'src/layout/Summary/index';

export function getConfig() {
  return {
    def: new Summary(),
    ...componentConfig,
  };
}

// Source hash: dc00823ad8331ac6d827b21fab6d61df379c3ad030b29e404b3cdf417e009f8f
