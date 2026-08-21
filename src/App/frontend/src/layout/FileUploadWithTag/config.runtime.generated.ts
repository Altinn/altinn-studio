import { componentConfig } from '@app/layout-contract/generated/components/FileUploadWithTag/config.generated';

import { FileUploadWithTag } from 'src/layout/FileUploadWithTag/index';

export function getConfig() {
  return {
    def: new FileUploadWithTag(),
    ...componentConfig,
  };
}

// Source hash: 79f58a254995d494e83ea2a3512a7099a21134bdbfa28d7d2d8de982fe22d9ec
