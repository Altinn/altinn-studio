import { componentConfig } from '@app/layout-contract/generated/components/Summary2/config.generated';

import { Summary2 } from 'src/layout/Summary2/index';

export function getConfig() {
  return {
    def: new Summary2(),
    ...componentConfig,
  };
}

// Source hash: 18762e1cfa9a7b28934de0117ef3c6a0f92df7c7db2eb0833bc31ac769709dec
