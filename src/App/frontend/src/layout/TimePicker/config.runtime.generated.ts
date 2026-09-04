import { componentConfig } from '@app/layout-contract/generated/components/TimePicker/config.generated';

import { TimePicker } from 'src/layout/TimePicker/index';

export function getConfig() {
  return {
    def: new TimePicker(),
    ...componentConfig,
  };
}

// Source hash: 181d7ea27249c245445f481eeb24a9c57013da8499dac7fe1678a7236d401c42
