import { componentConfig } from '@app/layout-contract/generated/components/Button/config.generated';

import { Button } from 'src/layout/Button/index';

export function getConfig() {
  return {
    def: new Button(),
    ...componentConfig,
  };
}

// Source hash: 7951b01a803f483269d428a6c6c056ae5455e0aa4a1e7bb0f78f9ac71bf397d5
