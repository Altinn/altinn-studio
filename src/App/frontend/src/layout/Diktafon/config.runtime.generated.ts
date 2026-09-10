import { componentConfig } from '@app/layout-contract/generated/components/Diktafon/config.generated';

import { Diktafon } from 'src/layout/Diktafon/index';

export function getConfig() {
  return {
    def: new Diktafon(),
    ...componentConfig,
  };
}

// Source hash: 8305c2fbe95455793468a7c68469c82575a081ee78defe67db927da873101aa1
