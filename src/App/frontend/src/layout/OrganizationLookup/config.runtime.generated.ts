import { componentConfig } from '@app/layout-contract/generated/components/OrganizationLookup/config.generated';

import { OrganizationLookup } from 'src/layout/OrganizationLookup/index';

export function getConfig() {
  return {
    def: new OrganizationLookup(),
    ...componentConfig,
  };
}

// Source hash: 6d08d13c381f66e09565af0fd5477b1a6431fb346d1624c3fb24e3c7c680574e
