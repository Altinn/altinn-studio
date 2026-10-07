import { componentConfig } from '@app/layout-contract/generated/components/Input/config.generated';

import { Input } from 'src/layout/Input/index';

export function getConfig() {
  return {
    def: new Input(),
    ...componentConfig,
  };
}

// Source hash: 71a98a98fa951575cedb8fe5211c9abbd8a4b84b0da6b652419fd86c45037df7
