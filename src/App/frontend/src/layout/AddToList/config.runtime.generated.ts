import { componentConfig } from '@app/layout-contract/generated/components/AddToList/config.generated';

import { AddToList } from 'src/layout/AddToList/index';

export function getConfig() {
  return {
    def: new AddToList(),
    ...componentConfig,
  };
}

// Source hash: bb92fa1076a11fe63eae56bf69332f271e5c12dfed2ed6f4f725f7e5ef80f280
