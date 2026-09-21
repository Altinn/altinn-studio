import { componentConfig } from '@app/layout-contract/generated/components/SigneeList/config.generated';

import { SigneeList } from 'src/layout/SigneeList/index';

export function getConfig() {
  return {
    def: new SigneeList(),
    ...componentConfig,
  };
}

// Source hash: 1e912088c5be84f45b851bd92cf26687a0796c0af954753bac301ce834f77ddf
