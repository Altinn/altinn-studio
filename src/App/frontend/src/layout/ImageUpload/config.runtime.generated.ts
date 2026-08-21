import { componentConfig } from '@app/layout-contract/generated/components/ImageUpload/config.generated';

import { ImageUpload } from 'src/layout/ImageUpload/index';

export function getConfig() {
  return {
    def: new ImageUpload(),
    ...componentConfig,
  };
}

// Source hash: 2a1087b059506ad101e6624263e1c7d2900f43e630bdfed5e73d9f5e98bd7b42
