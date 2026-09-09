import { componentConfig } from '@app/layout-contract/generated/components/Audio/config.generated';

import { Audio } from 'src/layout/Audio/index';

export function getConfig() {
  return {
    def: new Audio(),
    ...componentConfig,
  };
}

// Source hash: a9121712d134f7558aaed6d8aee5cf7799fdb42888a3dbfa3c40e6d27bf65e95
