import { componentConfig } from '@app/layout-contract/generated/components/Group/config.generated';

import { Group } from 'src/layout/Group/index';

export function getConfig() {
  return {
    def: new Group(),
    ...componentConfig,
  };
}

// Source hash: 74f2e869948b42cddc212c7a5a35d0b7b496f77a8c4ae2e95548ddc58d8ef825
