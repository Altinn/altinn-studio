import { componentConfig } from '@app/layout-contract/generated/components/CustomButton/config.generated';

import { CustomButton } from 'src/layout/CustomButton/index';

export function getConfig() {
  return {
    def: new CustomButton(),
    ...componentConfig,
  };
}

// Source hash: f26c6029b07615f79fd6e3d57cfe8061db902f518a558df8e4b01d461c095722
