import { componentConfig } from '@app/layout-contract/generated/components/Lommebok/config.generated';

import { Lommebok } from 'src/layout/Lommebok/index';

export function getConfig() {
  return {
    def: new Lommebok(),
    ...componentConfig,
  };
}

// Source hash: 0b5a8a8c5ce0b1839eb2e128ddfa9ce6b9c29a2da74e92cdb2939a92a94a4c28
