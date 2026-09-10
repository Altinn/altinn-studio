import { componentConfig } from '@app/layout-contract/generated/components/Samtale/config.generated';

import { Samtale } from 'src/layout/Samtale/index';

export function getConfig() {
  return {
    def: new Samtale(),
    ...componentConfig,
  };
}

// Source hash: 3491f990aa476d8a126ac79d8ff12ffc2c94c9405e9f29dd34cd5f7331bf376c
