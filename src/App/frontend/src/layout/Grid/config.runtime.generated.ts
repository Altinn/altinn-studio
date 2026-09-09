import { componentConfig } from '@app/layout-contract/generated/components/Grid/config.generated';

import { Grid } from 'src/layout/Grid/index';

export function getConfig() {
  return {
    def: new Grid(),
    ...componentConfig,
  };
}

// Source hash: b2be76bd875596253af6ff41b28ffa11ca87708d72f4554c0bd2f2802b189d50
