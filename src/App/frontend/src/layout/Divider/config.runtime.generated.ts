import { componentConfig } from '@app/layout-contract/generated/components/Divider/config.generated';

import { Divider } from 'src/layout/Divider/index';

export function getConfig() {
  return {
    def: new Divider(),
    ...componentConfig,
  };
}

// Source hash: a3df1b403deb8d2eafd5fe8b49c41e5c281defac60755a41f04c7b0e908fc52c
