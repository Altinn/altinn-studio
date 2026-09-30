import { componentConfig } from '@app/layout-contract/generated/components/Custom/config.generated';

import { Custom } from 'src/layout/Custom/index';

export function getConfig() {
  return {
    def: new Custom(),
    ...componentConfig,
  };
}

// Source hash: d01fa4d13a8b78fd77f365ab4918e5239af45c21bf9df48d24200cd8195c4e7b
