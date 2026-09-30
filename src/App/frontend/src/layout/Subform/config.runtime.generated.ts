import { componentConfig } from '@app/layout-contract/generated/components/Subform/config.generated';

import { Subform } from 'src/layout/Subform/index';

export function getConfig() {
  return {
    def: new Subform(),
    ...componentConfig,
  };
}

// Source hash: d3d30aaf5876242fb5d8c96828439f6db2b3230443e1b8eeb096b1ac4efa8b0a
