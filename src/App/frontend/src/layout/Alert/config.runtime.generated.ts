import { componentConfig } from '@app/layout-contract/generated/components/Alert/config.generated';

import { Alert } from 'src/layout/Alert/index';

export function getConfig() {
  return {
    def: new Alert(),
    ...componentConfig,
  };
}

// Source hash: 688820ac4220f0f2e9240f134863380f462e4b16157f23f2c349bc0de2a18b5d
