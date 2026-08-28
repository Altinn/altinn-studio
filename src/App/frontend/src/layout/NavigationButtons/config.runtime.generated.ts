import { componentConfig } from '@app/layout-contract/generated/components/NavigationButtons/config.generated';

import { NavigationButtons } from 'src/layout/NavigationButtons/index';

export function getConfig() {
  return {
    def: new NavigationButtons(),
    ...componentConfig,
  };
}

// Source hash: 6cc3fe11f4d706a93df5c2f848e6db68ec84b5bc803efdcb680148af79808644
