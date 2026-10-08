import { componentConfig } from '@app/layout-contract/generated/components/CustomReact/config.generated';

import { CustomReact } from 'src/layout/CustomReact/index';

export function getConfig() {
  return {
    def: new CustomReact(),
    ...componentConfig,
  };
}

// Source hash: 938acc663cb56105a7687542efd63a4f52795ea045e5c0013f2f85d201b2be81
