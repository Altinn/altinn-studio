import { componentConfig } from '@app/layout-contract/generated/components/PrintButton/config.generated';

import { PrintButton } from 'src/layout/PrintButton/index';

export function getConfig() {
  return {
    def: new PrintButton(),
    ...componentConfig,
  };
}

// Source hash: 864c628431c74929af5a5f851eebd3c0ec1b0a0e0f7b7c8857204f5e176ad90e
