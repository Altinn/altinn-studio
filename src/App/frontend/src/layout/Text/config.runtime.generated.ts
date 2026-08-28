import { componentConfig } from '@app/layout-contract/generated/components/Text/config.generated';

import { Text } from 'src/layout/Text/index';

export function getConfig() {
  return {
    def: new Text(),
    ...componentConfig,
  };
}

// Source hash: a6c7ac1360ae7dbb1582518cd7d8071ec377d54eb6988fcca50a191b9a97fcb9
