import { componentConfig } from '@app/layout-contract/generated/components/Address/config.generated';

import { Address } from 'src/layout/Address/index';

export function getConfig() {
  return {
    def: new Address(),
    ...componentConfig,
  };
}

// Source hash: a17fc61ec18dc7b0f361d5ccd0c8f767b440ba49c3cbcaafcd34a40068da446c
