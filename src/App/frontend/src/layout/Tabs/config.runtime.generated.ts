import { componentConfig } from '@app/layout-contract/generated/components/Tabs/config.generated';

import { Tabs } from 'src/layout/Tabs/index';

export function getConfig() {
  return {
    def: new Tabs(),
    ...componentConfig,
  };
}

// Source hash: 923913d22c225d7ba6a15dacd6871e2fa22145e551b33408b72190e3e7eff7cc
