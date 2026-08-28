import { componentConfig } from '@app/layout-contract/generated/components/MultipleSelect/config.generated';

import { MultipleSelect } from 'src/layout/MultipleSelect/index';

export function getConfig() {
  return {
    def: new MultipleSelect(),
    ...componentConfig,
  };
}

// Source hash: 4cce0902e7ab3a90580478c90917d97e38bda82cbf9f6bf9320dcbaeb9631657
