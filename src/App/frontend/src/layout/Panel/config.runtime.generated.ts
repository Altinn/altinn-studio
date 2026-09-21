import { componentConfig } from '@app/layout-contract/generated/components/Panel/config.generated';

import { Panel } from 'src/layout/Panel/index';

export function getConfig() {
  return {
    def: new Panel(),
    ...componentConfig,
  };
}

// Source hash: a795dbcf68d6265a01bf28dc93b29033c1ace6562cb3f4011c01f9f4be8db9db
