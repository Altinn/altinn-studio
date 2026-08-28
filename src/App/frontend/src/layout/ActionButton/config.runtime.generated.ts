import { componentConfig } from '@app/layout-contract/generated/components/ActionButton/config.generated';

import { ActionButton } from 'src/layout/ActionButton/index';

export function getConfig() {
  return {
    def: new ActionButton(),
    ...componentConfig,
  };
}

// Source hash: 91346dd2fe0f49fb2c181091ac38b4d07a6385de72e2cf200e1b808022aae130
