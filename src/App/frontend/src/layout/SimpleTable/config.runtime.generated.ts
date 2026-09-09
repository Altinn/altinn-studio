import { componentConfig } from '@app/layout-contract/generated/components/SimpleTable/config.generated';

import { SimpleTable } from 'src/layout/SimpleTable/index';

export function getConfig() {
  return {
    def: new SimpleTable(),
    ...componentConfig,
  };
}

// Source hash: 88080f2928db0e5cd4354ba50745d3beefb4f69763026860ec20ebf6f513a56a
