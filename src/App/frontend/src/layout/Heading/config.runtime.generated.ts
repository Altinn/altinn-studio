import { componentConfig } from '@app/layout-contract/generated/components/Heading/config.generated';

import { Heading } from 'src/layout/Heading/index';

export function getConfig() {
  return {
    def: new Heading(),
    ...componentConfig,
  };
}

// Source hash: 231d3724a0b9cd23e9f708b6b397dbfe5a87aa274b1d7386ffe9a7c8c9d775d2
