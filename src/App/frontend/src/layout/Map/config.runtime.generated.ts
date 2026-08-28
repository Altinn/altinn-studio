import { componentConfig } from '@app/layout-contract/generated/components/Map/config.generated';

import { Map } from 'src/layout/Map/index';

export function getConfig() {
  return {
    def: new Map(),
    ...componentConfig,
  };
}

// Source hash: 10f183978fa5a77d907095e764a64ed0b8326beb575dc6b15f7ad650768e2708
