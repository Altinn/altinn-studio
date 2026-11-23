import { componentConfig } from '@app/layout-contract/generated/components/BrokerFileTransfer/config.generated';

import { BrokerFileTransfer } from 'src/layout/BrokerFileTransfer/index';

export function getConfig() {
  return {
    def: new BrokerFileTransfer(),
    ...componentConfig,
  };
}

// Source hash: bd683ba953bd5d77d85195b2c7b89ead51e3645092396165dcd3adde21249853
