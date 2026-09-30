import { componentConfig } from '@app/layout-contract/generated/components/LikertItem/config.generated';

import { LikertItem } from 'src/layout/LikertItem/index';

export function getConfig() {
  return {
    def: new LikertItem(),
    ...componentConfig,
  };
}

// Source hash: 8d02cb055bc194f9bc58a2a14b839cae8bd323da57451efb4cc88c736fc807a9
