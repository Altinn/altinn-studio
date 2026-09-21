import { componentConfig } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { RepeatingGroup } from 'src/layout/RepeatingGroup/index';

export function getConfig() {
  return {
    def: new RepeatingGroup(),
    ...componentConfig,
  };
}

// Source hash: 98948aa014b399f795addd1ffd9e454451a6e24b3d89754d0e29ee5965b39540
