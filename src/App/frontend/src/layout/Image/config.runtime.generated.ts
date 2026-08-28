import { componentConfig } from '@app/layout-contract/generated/components/Image/config.generated';

import { Image } from 'src/layout/Image/index';

export function getConfig() {
  return {
    def: new Image(),
    ...componentConfig,
  };
}

// Source hash: 32a329a0b023a14967157ba737d8fcb5427f7775f718a46c824595c1d87b9915
