import { componentConfig } from '@app/layout-contract/generated/components/SigningDocumentList/config.generated';

import { SigningDocumentList } from 'src/layout/SigningDocumentList/index';

export function getConfig() {
  return {
    def: new SigningDocumentList(),
    ...componentConfig,
  };
}

// Source hash: 814e2cc8b25fc327be8624bf00f6382d6411c74883a88ad10d5418eb908e9eb5
