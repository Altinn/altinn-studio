import { componentConfig } from '@app/layout-contract/generated/components/InstanceInformation/config.generated';

import { InstanceInformation } from 'src/layout/InstanceInformation/index';

export function getConfig() {
  return {
    def: new InstanceInformation(),
    ...componentConfig,
  };
}

// Source hash: f6bc7fd150589fb4288511d7667074d7cdad5b943a8c094f129e17cec946eb65
