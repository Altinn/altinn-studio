import { componentConfig } from '@app/layout-contract/generated/components/Checkboxes/config.generated';

import { Checkboxes } from 'src/layout/Checkboxes/index';

export function getConfig() {
  return {
    def: new Checkboxes(),
    ...componentConfig,
  };
}

// Source hash: b02df2e62bdba2c33242ff060d43b92eb449caa105defbf8b3bddbe3c75f7070
