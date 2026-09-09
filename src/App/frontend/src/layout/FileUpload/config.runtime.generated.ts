import { componentConfig } from '@app/layout-contract/generated/components/FileUpload/config.generated';

import { FileUpload } from 'src/layout/FileUpload/index';

export function getConfig() {
  return {
    def: new FileUpload(),
    ...componentConfig,
  };
}

// Source hash: 6239b1b0fa2c69dd6fac61d918a385f9fe2936e48323a3a456e2dd43c72c10b2
