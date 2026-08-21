import { componentConfig } from '@app/layout-contract/generated/components/SigningActions/config.generated';

import { SigningActions } from 'src/layout/SigningActions/index';

export function getConfig() {
  return {
    def: new SigningActions(),
    ...componentConfig,
  };
}

// Source hash: 0626229875deecb90d30ec6937088a9869677cfa0fe6c802a53bf8137d4d75bd
