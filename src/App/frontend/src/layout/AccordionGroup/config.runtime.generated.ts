import { componentConfig } from '@app/layout-contract/generated/components/AccordionGroup/config.generated';

import { AccordionGroup } from 'src/layout/AccordionGroup/index';

export function getConfig() {
  return {
    def: new AccordionGroup(),
    ...componentConfig,
  };
}

// Source hash: 67e54907e919729a526ed86ceefa645f41fb4863723818ee5f893a794c510c37
