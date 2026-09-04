import { componentConfig } from '@app/layout-contract/generated/components/Option/config.generated';

import { Option } from 'src/layout/Option/index';

export function getConfig() {
  return {
    def: new Option(),
    ...componentConfig,
  };
}

// Source hash: b4c9d53128f60252c1685c77913cc6c52bb2068d2b8e4d89c9cbb66f49bd97ba
