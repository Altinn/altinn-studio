import { componentConfig } from '@app/layout-contract/generated/components/ButtonGroup/config.generated';

import { ButtonGroup } from 'src/layout/ButtonGroup/index';

export function getConfig() {
  return {
    def: new ButtonGroup(),
    ...componentConfig,
  };
}

// Source hash: 621e3e4f515297e6c1a043fe9c1c441f4257de38cba25bee3dd1568e413c2bf2
