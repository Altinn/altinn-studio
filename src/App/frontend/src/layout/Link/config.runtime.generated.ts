import { componentConfig } from '@app/layout-contract/generated/components/Link/config.generated';

import { Link } from 'src/layout/Link/index';

export function getConfig() {
  return {
    def: new Link(),
    ...componentConfig,
  };
}

// Source hash: 0097159287e3b386e8fd2cf8c985a0a014ac0156693da3f2f316a09fb3bbea24
