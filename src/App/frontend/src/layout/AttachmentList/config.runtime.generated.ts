import { componentConfig } from '@app/layout-contract/generated/components/AttachmentList/config.generated';

import { AttachmentList } from 'src/layout/AttachmentList/index';

export function getConfig() {
  return {
    def: new AttachmentList(),
    ...componentConfig,
  };
}

// Source hash: f7b11613462798da5b5e1da2e6f0043deb9532465ee5c63d8d8f6d2e1e0339ca
