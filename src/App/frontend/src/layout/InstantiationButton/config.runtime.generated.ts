import { componentConfig } from '@app/layout-contract/generated/components/InstantiationButton/config.generated';

import { InstantiationButton } from 'src/layout/InstantiationButton/index';

export function getConfig() {
  return {
    def: new InstantiationButton(),
    ...componentConfig,
  };
}

// Source hash: 40f31f6415ea7690248614018f31ecd607e55fe67b4b6587308e3ad1431dfbc8
