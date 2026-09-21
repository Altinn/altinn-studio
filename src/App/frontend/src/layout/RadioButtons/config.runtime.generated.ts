import { componentConfig } from '@app/layout-contract/generated/components/RadioButtons/config.generated';

import { RadioButtons } from 'src/layout/RadioButtons/index';

export function getConfig() {
  return {
    def: new RadioButtons(),
    ...componentConfig,
  };
}

// Source hash: 8576db80bf66e78b86abb4f2045b83383a8b1c5a4ed4fb8be3f46b18f13bd84a
