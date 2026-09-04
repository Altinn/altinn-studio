import { componentConfig } from '@app/layout-contract/generated/components/Accordion/config.generated';

import { Accordion } from 'src/layout/Accordion/index';

export function getConfig() {
  return {
    def: new Accordion(),
    ...componentConfig,
  };
}

// Source hash: d3c512d457d32348c68bf23b42ffd3a097d393315bde83911d60f32a70c7f511
