import { componentConfig } from '@app/layout-contract/generated/components/NavigationBar/config.generated';

import { NavigationBar } from 'src/layout/NavigationBar/index';

export function getConfig() {
  return {
    def: new NavigationBar(),
    ...componentConfig,
  };
}

// Source hash: 83feb7af9abedf22afe570f0d278ae144ec99dac5ea9a466428382b6ef0be0b6
