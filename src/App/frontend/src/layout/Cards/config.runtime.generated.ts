import { componentConfig } from '@app/layout-contract/generated/components/Cards/config.generated';

import { Cards } from 'src/layout/Cards/index';

export function getConfig() {
  return {
    def: new Cards(),
    ...componentConfig,
  };
}

// Source hash: f172764f4b3183fdef20605c4f2cfdfa7d4dc8bec1cbbea122fff85feef5c8ae
