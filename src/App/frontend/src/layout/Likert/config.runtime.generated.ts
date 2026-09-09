import { componentConfig } from '@app/layout-contract/generated/components/Likert/config.generated';

import { Likert } from 'src/layout/Likert/index';

export function getConfig() {
  return {
    def: new Likert(),
    ...componentConfig,
  };
}

// Source hash: a3e6fdf20eb7fde5bb932a4fed5c45e84479816beec3a793b516a7296be13d36
