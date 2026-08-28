import { componentConfig } from '@app/layout-contract/generated/components/Video/config.generated';

import { Video } from 'src/layout/Video/index';

export function getConfig() {
  return {
    def: new Video(),
    ...componentConfig,
  };
}

// Source hash: da8e4ed8ea2f75a7ea140e92b284a5151e0f3357b7acb90c31057021a5c47347
