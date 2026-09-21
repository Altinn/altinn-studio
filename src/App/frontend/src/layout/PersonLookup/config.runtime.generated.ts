import { componentConfig } from '@app/layout-contract/generated/components/PersonLookup/config.generated';

import { PersonLookup } from 'src/layout/PersonLookup/index';

export function getConfig() {
  return {
    def: new PersonLookup(),
    ...componentConfig,
  };
}

// Source hash: 2b1d5497a39bbb3b86e614c594b37985cb6f3adf460e5707781f04f4d4758f08
