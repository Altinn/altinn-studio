import { componentConfig } from '@app/layout-contract/generated/components/Datepicker/config.generated';

import { Datepicker } from 'src/layout/Datepicker/index';

export function getConfig() {
  return {
    def: new Datepicker(),
    ...componentConfig,
  };
}

// Source hash: e397af1b46f16ffe111e4f9074c48ec13623157e3071d0250f344d5888f37869
