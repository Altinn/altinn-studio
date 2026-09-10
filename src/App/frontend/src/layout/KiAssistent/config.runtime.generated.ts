import { componentConfig } from '@app/layout-contract/generated/components/KiAssistent/config.generated';

import { KiAssistent } from 'src/layout/KiAssistent/index';

export function getConfig() {
  return {
    def: new KiAssistent(),
    ...componentConfig,
  };
}

// Source hash: 9d1d74e0ab9d7ccd045a13325f5fb934342cc9b34c9d0be5327de8660053550f
