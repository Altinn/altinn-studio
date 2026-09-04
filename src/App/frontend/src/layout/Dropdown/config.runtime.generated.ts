import { componentConfig } from '@app/layout-contract/generated/components/Dropdown/config.generated';

import { Dropdown } from 'src/layout/Dropdown/index';

export function getConfig() {
  return {
    def: new Dropdown(),
    ...componentConfig,
  };
}

// Source hash: 537902ef4711b73834d3ee23d2f3b6f206a2c6e4f3997655477d4bc8f0972321
