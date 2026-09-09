import { componentConfig } from '@app/layout-contract/generated/components/Number/config.generated';

import { Number } from 'src/layout/Number/index';

export function getConfig() {
  return {
    def: new Number(),
    ...componentConfig,
  };
}

// Source hash: 3d8f0eb2050f897a747f95e63af135a3acc6f02acf8690b23f7271df0fd6c28a
