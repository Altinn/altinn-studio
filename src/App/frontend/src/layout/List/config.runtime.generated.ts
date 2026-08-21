import { componentConfig } from '@app/layout-contract/generated/components/List/config.generated';

import { List } from 'src/layout/List/index';

export function getConfig() {
  return {
    def: new List(),
    ...componentConfig,
  };
}

// Source hash: d3407dbadc11247bcdf3285ccc9917dc7be7c683da2d9c9b5fe209c4310ae9f2
